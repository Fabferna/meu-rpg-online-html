"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import { QUESTS, QUEST_BY_ID } from "@/lib/game/quests";
import { fmtTime, post } from "./api";
import { play } from "./sfx";
import { askNotificationPermission } from "./notify";
import { Bar, Panel, RankBadge } from "./ui";
import { REGION_OF_QUEST, regionUnlocked } from "@/lib/game/regions";
import { useT } from "@/lib/i18n/client";
import { DAILY_QUESTS } from "@/lib/game/rules";

export default function Quests({ ctx }: { ctx: GameCtx }) {
  const t = useT();
  const { state } = ctx;
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now() + ctx.skew);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + ctx.skew), 500);
    return () => clearInterval(t);
  }, [ctx.skew]);

  async function start(id: string) {
    setBusy(true);
    try {
      await post("/api/quests/start", { questId: id });
      askNotificationPermission();
      ctx.toast("📜 Missão iniciada!");
      await ctx.refresh();
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function claim() {
    setBusy(true);
    try {
      const { rewards } = await post<{ rewards: { xp: number; gold: number; item: string | null; levelUps: number } }>("/api/quests/claim");
      play("coin");
      ctx.toast(`+${rewards.xp} XP · +${rewards.gold} 🪙${rewards.item ? ` · 🎁 ${t("item!")}` : ""}`, "reward");
      await ctx.refresh();
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const active = state.quest;
  if (active) {
    const q = QUEST_BY_ID[active.questId];
    const start = new Date(active.startedAt).getTime();
    const end = new Date(active.endsAt).getTime();
    const left = Math.max(0, (end - now) / 1000);
    const done = left <= 0;
    return (
      <Panel className="mx-auto max-w-2xl overflow-hidden">
        <div className="relative aspect-[21/9]">
          <Image src={q?.image ?? "/assets/loader.webp"} alt="" fill sizes="700px" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-panel to-transparent" />
        </div>
        <div className="p-6 text-center">
          <h2 className="font-display text-2xl">{q ? t(q.title) : ""}</h2>
          <p className="mt-1 text-sm text-white/60">{q ? t(q.description) : ""}</p>
          <p className={`mt-6 font-display text-5xl tabular-nums ${done ? "text-emerald-400" : "text-gold"}`}>{done ? t("Concluída!") : fmtTime(left)}</p>
          <div className="mt-4"><Bar value={Math.min(end - start, now - start)} max={end - start} color="bg-gold" /></div>
          <p className="mt-4 text-sm text-white/70">{t("Recompensa:")} {active.rewards.xp} XP · {active.rewards.gold} 🪙{active.rewards.item ? ` · 🎁 ${t("item raro")}` : ""}</p>
          {!done && (
            <button className="mt-6 rounded-lg bg-sky-600/80 px-6 py-2.5 text-sm font-semibold hover:bg-sky-500" disabled={busy}
              onClick={async () => {
                setBusy(true);
                try { const r = await post<{ price: number }>("/api/shop/rush-quest"); ctx.toast(t("⚡ Missão concluída por 💎 {n}", { n: r.price })); await ctx.refresh(); }
                catch (e) { ctx.toast((e as Error).message, "error"); }
                finally { setBusy(false); }
              }}>
              {t("Concluir agora")} · 💎 {Math.max(1, Math.ceil(left / 300))}
            </button>
          )}
          {done && (
            <motion.button initial={{ scale: 0.8 }} animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}
              className="btn-gold mt-6 px-10" disabled={busy} onClick={claim}>
              {t("Receber Recompensa")}
            </motion.button>
          )}
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
    <p className={`text-sm ${state.daily.quests >= DAILY_QUESTS ? "text-amber-300" : "text-white/60"}`}>{t("Missões hoje: {a}/{b}", { a: state.daily.quests, b: DAILY_QUESTS })}</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {QUESTS.map((q, i) => {
        const region = REGION_OF_QUEST[q.id];
        const regionLocked = !regionUnlocked(region, state.character.storyChapter);
        const locked = state.character.level < q.minLevel || regionLocked;
        const noEnergy = state.character.energy < q.energy;
        return (
          <motion.div key={q.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`panel overflow-hidden ${locked ? "opacity-50 grayscale" : ""}`}>
            <div className="relative aspect-video">
              <Image src={q.image} alt="" fill sizes="400px" className="object-cover" />
              <div className="absolute left-3 top-3"><RankBadge rank={q.rank} /></div>
              {region && <span className="absolute right-3 top-3 rounded bg-black/60 px-2 py-0.5 text-[11px]">{regionLocked ? "🔒 " : "📍 "}{t(region.name)}</span>}
            </div>
            <div className="space-y-2 p-4">
              <h3 className="font-display">{t(q.title)}</h3>
              <p className="text-xs text-white/60">{t(q.description)}</p>
              <div className="flex flex-wrap gap-2 text-xs text-white/80">
                <span className="rounded bg-black/40 px-2 py-1">⏱ {fmtTime(q.durationSec)}</span>
                <span className={`rounded bg-black/40 px-2 py-1 ${noEnergy ? "text-red-300" : ""}`}>⚡ {q.energy}</span>
                <span className="rounded bg-black/40 px-2 py-1">✨ {q.xp[0]}–{q.xp[1]}</span>
                <span className="rounded bg-black/40 px-2 py-1">🪙 {q.gold[0]}–{q.gold[1]}</span>
              </div>
              <button className="btn-gold w-full !py-2 text-sm" disabled={busy || locked || noEnergy || !!state.battle} onClick={() => start(q.id)}>
                {regionLocked ? t("Libera no Capítulo {n}", { n: region!.unlockChapter }) : locked ? t("Requer nível {n}", { n: q.minLevel }) : noEnergy ? t("Sem energia") : t("Iniciar")}
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
    </div>
  );
}
