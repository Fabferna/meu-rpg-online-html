"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import { WEEKLY_PARTICIPATION, WEEKLY_POINTS, WEEKLY_REWARDS, type WeeklyTier } from "@/lib/game/weekly";
import { fmtTime, post } from "./api";
import { Panel } from "./ui";
import Avatar from "./Avatar";
import { play } from "./sfx";

type Base = { pos: number; name: string; raceName: string; level: number; portrait: string; frame: string | null; title: string | null };
type GlobalRow = Base & { pvp_rating: number; pvp_wins: number; pvp_losses: number };
type WeekRow = Base & { score: number };
type Week = {
  week: string; endsInSec: number; rows: WeekRow[];
  me: { pos: number; score: number; reward: WeeklyTier | null } | null;
  lastWeek: { week: string; pos: number; score: number; reward: WeeklyTier | null; claimed: boolean } | null;
};

const medal = ["🥇", "🥈", "🥉"];
const prize = (t: { gems: number; gold: number; cosmetic?: string } | null) =>
  t ? [t.gems && `💎 ${t.gems}`, t.gold && `🪙 ${t.gold}`, t.cosmetic && "título “Campeão Semanal”"].filter(Boolean).join(" + ") : "—";

export default function Ranking({ ctx }: { ctx: GameCtx }) {
  const [scope, setScope] = useState<"week" | "global">("week");
  const [week, setWeek] = useState<Week | null>(null);
  const [global, setGlobal] = useState<GlobalRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadedAt, setLoadedAt] = useState(Date.now());
  const [, tick] = useState(0);

  const load = useCallback(async () => {
    const [w, g] = await Promise.all([
      fetch("/api/ranking?scope=week", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/ranking").then((r) => (r.ok ? r.json() : null)),
    ]);
    setWeek(w); setGlobal(g?.rows ?? []); setLoadedAt(Date.now());
  }, []);
  useEffect(() => { load(); const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, [load]);

  async function claim() {
    setBusy(true);
    try {
      const r = await post<{ pos: number; gems: number; gold: number }>("/api/ranking/claim");
      play("victory");
      ctx.toast(`🏆 Prêmio da semana (${r.pos}º): ${prize(r)}`, "reward");
      await Promise.all([load(), ctx.refresh()]);
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const lw = week?.lastWeek;
  return (
    <div className="space-y-5">
      {lw?.reward && !lw.claimed && (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="panel flex flex-wrap items-center gap-4 bg-gradient-to-r from-amber-900/50 to-fuchsia-900/30 p-5 ring-2 ring-gold">
          <span className="text-4xl">{medal[lw.pos - 1] ?? "🏆"}</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg">A semana passada terminou! Você ficou em {lw.pos}º com {lw.score} pontos.</p>
            <p className="text-sm text-white/70">Prêmio: {prize(lw.reward)}</p>
          </div>
          <button className="btn-gold" disabled={busy} onClick={claim}>Resgatar prêmio</button>
        </motion.div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {([["week", "📅 Esta semana"], ["global", "⭐ Geral (Rating PVP)"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setScope(k)} className={`rounded-lg px-4 py-2 text-sm font-display ${scope === k ? "bg-gold text-ink" : "bg-white/5 text-white/70"}`}>{l}</button>
        ))}
        {scope === "week" && week && (
          <span className="ml-auto rounded-full bg-ember/30 px-3 py-1 text-xs">Termina em {fmtTime(week.endsInSec - (Date.now() - loadedAt) / 1000)}</span>
        )}
      </div>

      {scope === "week" ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <Panel className="overflow-x-auto p-2">
            {week?.me && (
              <p className="m-2 rounded-lg bg-gold/10 px-3 py-2 text-sm">
                Você está em <b>{week.me.pos}º</b> com <b>{week.me.score}</b> pontos{week.me.reward ? ` · prêmio atual: ${prize(week.me.reward)}` : ""}.
              </p>
            )}
            <Table rows={week?.rows ?? null} me={ctx.state.character.name} cols={[["Pontos", (r) => <span className="font-display text-gold">{(r as WeekRow).score}</span>]]}
              empty="Ninguém pontuou ainda nesta semana. Seja o primeiro!" />
          </Panel>
          <div className="space-y-4">
            <Panel className="p-4 text-sm">
              <h3 className="font-display text-gold">Como pontuar</h3>
              <ul className="mt-2 space-y-1 text-white/80">
                <li>🏟️ Vitória na Arena: <b>{WEEKLY_POINTS.pvp_win}</b></li>
                <li>👑 Chefe derrotado: <b>{WEEKLY_POINTS.boss_win}</b></li>
                <li>📜 Missão concluída: <b>{WEEKLY_POINTS.quest}</b></li>
                <li>⚔️ Caçada vencida: <b>{WEEKLY_POINTS.pve_win}</b></li>
              </ul>
            </Panel>
            <Panel className="p-4 text-sm">
              <h3 className="font-display text-gold">Prêmios da semana</h3>
              <ul className="mt-2 space-y-1.5">
                {WEEKLY_REWARDS.map((t) => <li key={t.label} className="flex justify-between gap-2"><span className="text-white/70">{t.label}</span><span className="text-right">{prize(t)}</span></li>)}
                <li className="flex justify-between gap-2"><span className="text-white/70">{WEEKLY_PARTICIPATION.minScore}+ pontos</span><span>{prize(WEEKLY_PARTICIPATION)}</span></li>
              </ul>
              <p className="mt-3 text-[11px] text-white/40">A temporada vai de segunda a domingo (horário UTC). Resgate o prêmio durante a semana seguinte.</p>
            </Panel>
          </div>
        </div>
      ) : (
        <Panel className="overflow-x-auto p-2">
          <Table rows={global} me={ctx.state.character.name} cols={[
            ["Rating", (r) => <span className="font-display text-gold">{(r as GlobalRow).pvp_rating}</span>],
            ["V/D", (r) => <span className="text-white/60">{(r as GlobalRow).pvp_wins}/{(r as GlobalRow).pvp_losses}</span>],
          ]} empty="Ninguém no ranking ainda." />
        </Panel>
      )}
    </div>
  );
}

function Table({ rows, cols, me, empty }: { rows: Base[] | null; cols: [string, (r: Base) => React.ReactNode][]; me: string; empty: string }) {
  if (!rows) return <p className="p-6 text-center text-white/50">Carregando…</p>;
  if (!rows.length) return <p className="p-6 text-center text-white/50">{empty}</p>;
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs uppercase text-white/40">
        <tr><th className="p-3">#</th><th>Herói</th><th className="hidden sm:table-cell">Raça</th><th>Nível</th>{cols.map(([h]) => <th key={h}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} className={`border-t border-white/5 ${r.name === me ? "bg-gold/10" : ""}`}>
            <td className="p-3 font-display">{medal[r.pos - 1] ?? r.pos}</td>
            <td><div className="flex items-center gap-2 py-1"><Avatar src={r.portrait} frame={r.frame} size={36} /><div className="min-w-0"><p className="truncate font-display">{r.name}</p>{r.title && <p className="text-[11px] text-amber-200/80">« {r.title} »</p>}</div></div></td>
            <td className="hidden text-white/60 sm:table-cell">{r.raceName}</td>
            <td>{r.level}</td>
            {cols.map(([h, f]) => <td key={h}>{f(r)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
