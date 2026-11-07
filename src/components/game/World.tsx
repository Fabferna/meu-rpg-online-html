"use client";

import { xpRate } from "@/lib/game/rules";
import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import { CHAPTERS, SPEAKERS, trailLevel, trailOf, type Chapter } from "@/lib/game/story";
import { REGIONS_MAP, REGION_BY_ID } from "@/lib/game/regions";
import { ENEMY_BY_ID } from "@/lib/game/enemies";
import { QUEST_BY_ID } from "@/lib/game/quests";
import { ITEM_BY_ID } from "@/lib/game/items";
import { COSMETIC_BY_ID } from "@/lib/shop/catalog";
import { post } from "./api";
import { Panel } from "./ui";
import { play } from "./sfx";
import { useT } from "@/lib/i18n/client";

export default function World({ ctx, onBattle }: { ctx: GameCtx; onBattle: () => void }) {
  const t = useT();
  const c = ctx.state.character;
  const done = c.storyChapter;
  const next = CHAPTERS.find((ch) => ch.n === done + 1);
  const [reading, setReading] = useState<Chapter | null>(null);
  const [busy, setBusy] = useState(false);

  const trail = next ? trailOf(next.n) : [];
  const trailDone = Math.min(c.storyTrail ?? 0, trail.length);
  const bossReady = trailDone >= trail.length;

  async function fight(ch: Chapter, step?: number) {
    setBusy(true);
    try {
      await post("/api/story/battle", step ? { chapter: ch.n, step } : { chapter: ch.n });
      play("skill");
      await ctx.refresh();
      setReading(null);
      onBattle();
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* HISTÓRIA */}
      <Panel className="overflow-hidden">
        <div className="grid md:grid-cols-[1fr_280px]">
          <div className="space-y-3 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">{t("História principal · {a}/{b} capítulos", { a: done, b: CHAPTERS.length })}</p>
            <div className="flex gap-1">
              {CHAPTERS.map((ch) => <span key={ch.n} className={`h-1.5 flex-1 rounded-full ${ch.n <= done ? "bg-gold" : ch.n === done + 1 ? "bg-gold/40 animate-pulse" : "bg-white/10"}`} />)}
            </div>
            {next ? (
              <>
                <h2 className="font-display text-2xl text-gold">{t("Capítulo {n}", { n: next.n })}: {t(next.title)}</h2>
                <p className="text-sm text-white/60">{t(REGION_BY_ID[next.region]?.name ?? "")} · {t("Nível recomendado {n}+", { n: next.minLevel })}</p>
                <p className="text-sm text-white/80">“{t(next.scenes[0].text, { heroi: c.name })}”</p>
                {/* Caminho do capítulo: 2 trechos (nível do capítulo anterior) e depois o chefe. */}
                <ol className="grid gap-2 pt-1 sm:grid-cols-3">
                  {trail.map((st, i) => {
                    const e = ENEMY_BY_ID[st.enemy];
                    const isDone = i < trailDone, isNext = i === trailDone, lvl = trailLevel(next.n);
                    return (
                      <li key={st.enemy} className={`rounded-lg p-2 ring-1 ${isDone ? "bg-emerald-500/10 ring-emerald-400/30" : isNext ? "bg-gold/10 ring-gold/40" : "bg-white/5 ring-white/10 opacity-60"}`}>
                        <div className="flex items-center gap-2">
                          <Image src={e.image} alt="" width={40} height={40} className="h-10 w-10 rounded object-cover" />
                          <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-wider text-white/50">{t("Trecho {n}", { n: i + 1 })}{isDone ? " ✓" : ""}</p>
                            <p className="truncate text-sm">{t(e.name)}</p>
                          </div>
                        </div>
                        {isNext && <p className="mt-1 text-xs text-white/70">“{t(st.text, { heroi: c.name })}”</p>}
                        {isNext && (c.level >= lvl
                          ? <button disabled={busy} onClick={() => fight(next, i + 1)} className="btn-gold mt-2 min-h-11 w-full !py-1.5 text-xs">⚔️ {t("Enfrentar")} · ✨ {xpRate(e.xp)} XP</button>
                          : <p className="mt-1 text-xs text-amber-300">{t("Requer nível {n}", { n: lvl })}</p>)}
                      </li>
                    );
                  })}
                  <li className={`rounded-lg p-2 ring-1 ${bossReady ? "bg-gold/10 ring-gold/40" : "bg-white/5 ring-white/10 opacity-60"}`}>
                    <div className="flex items-center gap-2">
                      <Image src={ENEMY_BY_ID[next.enemy].image} alt="" width={40} height={40} className="h-10 w-10 rounded object-cover" />
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wider text-white/50">👑 {t("Chefe do capítulo")}</p>
                        <p className="truncate text-sm">{t(ENEMY_BY_ID[next.enemy].name)}</p>
                      </div>
                    </div>
                    {bossReady && <button className="btn-gold mt-2 min-h-11 w-full !py-1.5 text-xs" onClick={() => setReading(next)}>📖 {c.level < next.minLevel ? t("Ler capítulo") : t("Começar capítulo")}</button>}
                    {!bossReady && <p className="mt-1 text-xs text-white/50">{t("Vença os trechos antes")}</p>}
                    {bossReady && c.level < next.minLevel && <p className="mt-1 text-xs text-amber-300">{t("Requer nível {n} para a batalha", { n: next.minLevel })}</p>}
                  </li>
                </ol>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl text-gold">{t("Lenda concluída!")}</h2>
                <p className="text-sm text-white/70">{t("Você salvou Aethelgard. Novos capítulos chegarão em breve.")}</p>
              </>
            )}
          </div>
          <div className="relative hidden min-h-48 md:block">
            {next && <Image src={ENEMY_BY_ID[next.enemy].image} alt="" fill sizes="280px" className="object-cover opacity-70" />}
            <div className="absolute inset-0 bg-gradient-to-r from-panel to-transparent" />
            {next && <p className="absolute bottom-3 right-3 rounded bg-black/70 px-2 py-1 text-xs">⚔️ {t(ENEMY_BY_ID[next.enemy].name)}</p>}
          </div>
        </div>
        {done > 0 && (
          <details className="border-t border-white/10 px-6 py-3 text-sm">
            <summary className="cursor-pointer text-white/60">{t("Reler capítulos concluídos")}</summary>
            <div className="mt-2 flex flex-wrap gap-2">
              {CHAPTERS.filter((ch) => ch.n <= done).map((ch) => (
                <button key={ch.n} onClick={() => setReading(ch)} className="rounded-md bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10">{ch.n}. {ch.title}</button>
              ))}
            </div>
          </details>
        )}
      </Panel>

      {/* MAPA */}
      <section>
        <h2 className="mb-3 font-display text-xl text-gold">{t("🗺️ Regiões de Aethelgard")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REGIONS_MAP.map((r) => {
            const open = done >= r.unlockChapter;
            return (
              <motion.div key={r.id} whileHover={{ y: -3 }} className={`panel overflow-hidden ${open ? "" : "opacity-70"}`}>
                <div className="relative aspect-video">
                  <Image src={r.image} alt="" fill sizes="400px" className={`object-cover ${open ? "" : "grayscale blur-[1px]"}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-panel via-transparent" />
                  {!open && <span className="absolute inset-0 grid place-items-center text-4xl">🔒</span>}
                  <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[11px]">{r.recommended}</span>
                </div>
                <div className="space-y-1.5 p-4">
                  <h3 className="font-display text-lg">{t(r.name)}</h3>
                  <p className="text-xs text-white/60">{t(r.description)}</p>
                  {open ? (
                    <p className="text-[11px] text-white/50">
                      📜 {r.quests.map((q) => t(QUEST_BY_ID[q]?.title ?? "")).join(", ")}<br />
                      ⚔️ {r.enemies.map((e) => t(ENEMY_BY_ID[e]?.name ?? "")).join(", ")}
                      {r.dungeons.length > 0 && <><br />{t("🗝️ Masmorra disponível")}</>}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-300">{t("Liberada ao concluir o Capítulo {n} da história.", { n: r.unlockChapter })}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <StoryReader ch={reading} hero={c.name} canFight={!!reading && reading.n === done + 1 && bossReady && c.level >= reading.minLevel}
        busy={busy} onFight={() => reading && fight(reading)} onClose={() => setReading(null)} replay={!!reading && reading.n <= done} />
    </div>
  );
}

function StoryReader({ ch, hero, canFight, busy, onFight, onClose, replay }: { ch: Chapter | null; hero: string; canFight: boolean; busy: boolean; onFight: () => void; onClose: () => void; replay: boolean }) {
  const t = useT();
  const [i, setI] = useState(0);
  const scenes = ch ? [...ch.scenes, ...(replay ? [{ who: "narrador" as const, text: ch.victory }] : [])] : [];
  const s = scenes[i];
  const last = i >= scenes.length - 1;
  const sp = s ? SPEAKERS[s.who] : null;
  const close = () => { setI(0); onClose(); };
  const enemy = ch ? ENEMY_BY_ID[ch.enemy] : null;
  const reward = ch?.rewards;

  return (
    <AnimatePresence>
      {ch && s && sp && (
        <motion.div className="fixed inset-0 z-[57] flex items-end justify-center bg-black/80 p-3 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 -z-10">
            <Image src={REGION_BY_ID[ch.region]?.image ?? ""} alt="" fill sizes="100vw" className="object-cover opacity-25" />
          </div>
          <motion.div initial={{ y: 30 }} animate={{ y: 0 }} className="panel w-full max-w-2xl overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="story-title">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <p id="story-title" className="font-display text-gold">{t("Capítulo {n}", { n: ch.n })}: {t(ch.title)}</p>
              <button onClick={close} aria-label={t("Fechar")} className="px-2 text-white/50 hover:text-white">✕</button>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex min-h-48 gap-4 p-5">
                {sp.portrait && (
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg ring-2 ring-gold/40 sm:h-36 sm:w-28">
                    <Image src={sp.portrait} alt={t(sp.name)} fill sizes="112px" className="object-cover" />
                  </div>
                )}
                <div className="min-w-0">
                  {sp.name && <p className="mb-1 font-display text-sm text-gold">{t(sp.name)}</p>}
                  <p className={`leading-relaxed ${sp.portrait ? "" : "italic text-white/80"}`}>{t(s.text, { heroi: hero })}</p>
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-3">
              <span className="text-xs text-white/40">{i + 1}/{scenes.length}</span>
              <div className="flex gap-2">
                {i > 0 && <button onClick={() => setI(i - 1)} className="rounded-lg bg-white/10 px-4 py-2 text-sm">{t("Voltar")}</button>}
                {!last ? <button onClick={() => { setI(i + 1); play("click"); }} className="btn-gold">{t("Continuar ▸")}</button>
                  : replay ? <button onClick={close} className="btn-gold">{t("Fechar")}</button>
                  : canFight ? <button disabled={busy} onClick={() => { setI(0); onFight(); }} className="btn-gold">⚔️ {t("Enfrentar {x}", { x: t(enemy?.name ?? "") })}</button>
                  : <button onClick={close} className="rounded-lg bg-white/10 px-4 py-2 text-sm">{t("Volte no nível {n}", { n: ch.minLevel })}</button>}
              </div>
            </div>
            {!replay && last && reward && (
              <p className="border-t border-white/10 bg-black/30 px-5 py-2 text-xs text-white/70">
                {t("Recompensa:")} ✨ {xpRate(reward.xp)} XP · 🪙 {reward.gold}{reward.gems ? ` · 💎 ${reward.gems}` : ""}
                {reward.item ? ` · ${t(ITEM_BY_ID[reward.item]?.name ?? "")}` : ""}{reward.cosmetic ? ` · ${t("título “{x}”", { x: t(COSMETIC_BY_ID[reward.cosmetic]?.name ?? "") })}` : ""} · {t("sem custo de energia")}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
