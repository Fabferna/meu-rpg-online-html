"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import type { Achievement, DailyGoal } from "@/lib/game/goals";
import { COSMETIC_BY_ID, secondsToUtcMidnight } from "@/lib/shop/catalog";
import { fmtTime, post } from "./api";
import { Bar, Panel } from "./ui";
import { play } from "./sfx";

type GoalsState = {
  daily: (DailyGoal & { progress: number; claimed: boolean })[];
  bonus: { gold: number; gems: number; ready: boolean; claimed: boolean };
  achievements: (Achievement & { progress: number; claimed: boolean })[];
};

export default function Goals({ ctx, onCount }: { ctx: GameCtx; onCount?: (n: number) => void }) {
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
    onCount(g.daily.filter((d) => !d.claimed && d.progress >= d.target).length + g.achievements.filter((a) => !a.claimed && a.progress >= a.target).length);
  }, [g, onCount]);

  async function claim(body: object) {
    setBusy(true);
    try {
      const r = await post<{ gold: number; gems: number; cosmetic: string | null }>("/api/goals/claim", body);
      play("coin");
      ctx.toast(`🎁 ${[r.gold && `+${r.gold} 🪙`, r.gems && `+${r.gems} 💎`, r.cosmetic && `Título “${COSMETIC_BY_ID[r.cosmetic]?.name}”`].filter(Boolean).join(" · ")}`, "reward");
      await Promise.all([load(), ctx.refresh()]);
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (!g) return <p className="text-white/50">Carregando objetivos…</p>;
  const reward = (gold: number, gems: number) => [gold ? `🪙 ${gold}` : "", gems ? `💎 ${gems}` : ""].filter(Boolean).join(" + ");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-xl text-gold">🎯 Missões Diárias</h2>
          <span className="text-xs text-white/50">Renovam em {fmtTime(secondsToUtcMidnight())}</span>
        </div>
        {g.daily.map((d) => {
          const done = d.progress >= d.target;
          return (
            <Panel key={d.id} className="flex items-center gap-3 p-4">
              <span className="text-2xl">{d.icon}</span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex justify-between text-sm"><span>{d.title}</span><span className="text-white/50">{d.progress}/{d.target}</span></div>
                <Bar value={d.progress} max={d.target} color={done ? "bg-emerald-500" : "bg-gold"} />
              </div>
              <button disabled={busy || !done || d.claimed} onClick={() => claim({ kind: "daily", id: d.id })}
                className={`min-w-24 rounded-lg px-3 py-2 text-xs font-semibold ${d.claimed ? "bg-white/5 text-white/40" : done ? "btn-gold" : "bg-white/5 text-white/60"}`}>
                {d.claimed ? "✔ Feito" : reward(d.gold, d.gems)}
              </button>
            </Panel>
          );
        })}
        <motion.div animate={g.bonus.ready && !g.bonus.claimed ? { scale: [1, 1.02, 1] } : {}} transition={{ repeat: Infinity, duration: 1.6 }}
          className="panel flex items-center gap-3 bg-gradient-to-r from-fuchsia-900/30 to-amber-900/30 p-4 ring-1 ring-arcane/50">
          <span className="text-2xl">🏅</span>
          <p className="flex-1 text-sm">Complete todas as diárias: <b>{reward(g.bonus.gold, g.bonus.gems)}</b></p>
          <button disabled={busy || !g.bonus.ready || g.bonus.claimed} onClick={() => claim({ kind: "bonus" })}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${g.bonus.claimed ? "bg-white/5 text-white/40" : g.bonus.ready ? "btn-gold" : "bg-white/5 text-white/60"}`}>
            {g.bonus.claimed ? "✔ Feito" : "Resgatar"}
          </button>
        </motion.div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-gold">🏆 Conquistas</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {g.achievements.map((a) => {
            const done = a.progress >= a.target;
            return (
              <div key={a.id} className={`panel space-y-2 p-4 ${a.claimed ? "opacity-60" : done ? "ring-1 ring-gold" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-sm">{a.title}</p>
                    <p className="text-[11px] text-white/50">{a.description}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-white/50">{a.progress}/{a.target}</span>
                </div>
                <Bar value={a.progress} max={a.target} color={done ? "bg-emerald-500" : "bg-arcane"} />
                <button disabled={busy || !done || a.claimed} onClick={() => claim({ kind: "achievement", id: a.id })}
                  className={`w-full rounded-md py-1.5 text-xs font-semibold ${a.claimed ? "bg-white/5 text-white/40" : done ? "btn-gold" : "bg-white/5 text-white/60"}`}>
                  {a.claimed ? "✔ Conquistada" : `${reward(a.gold, a.gems)}${a.cosmetic ? ` + título “${COSMETIC_BY_ID[a.cosmetic]?.name}”` : ""}`}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
