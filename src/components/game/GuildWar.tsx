"use client";

import { useCallback, useEffect, useState } from "react";
import type { GameCtx } from "./GameApp";
import { GUILD_WAR_REWARDS } from "@/lib/game/guildBoss";
import { WEEKLY_POINTS } from "@/lib/game/weekly";
import { fmtTime, post } from "./api";
import { Panel } from "./ui";
import { play } from "./sfx";
import { useT } from "@/lib/i18n/client";

type Row = { pos: number; name: string; tag: string; level: number; score: number; mine: boolean };
type Data = { endsInSec: number; rows: Row[]; mine: Row | null; claimable: { pos: number; gems: number; gold: number } | null };

export default function GuildWar({ ctx }: { ctx: GameCtx }) {
  const t = useT();
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch("/api/guild-war", { cache: "no-store" });
    if (r.ok) setD(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  async function claim() {
    setBusy(true);
    try {
      const r = await post<{ pos: number; gems: number; gold: number }>("/api/guild-war/claim");
      play("victory");
      ctx.toast(`🏆 ${t("Guerra de Guildas")} (${r.pos}º): +${r.gems} 💎 · +${r.gold} 🪙`, "reward");
      await Promise.all([load(), ctx.refresh()]);
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (!d) return <p className="text-white/50">{t("Carregando guerra…")}</p>;
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        {d.claimable && (
          <Panel className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-amber-900/50 to-fuchsia-900/30 p-5 ring-2 ring-gold">
            <span className="text-4xl">{["🥇", "🥈", "🥉"][d.claimable.pos - 1]}</span>
            <p className="flex-1">{t("Sua guilda ficou em")} <b>{d.claimable.pos}º</b> {t("na Guerra da semana passada!")}</p>
            <button className="btn-gold" disabled={busy} onClick={claim}>{t("Resgatar")} 💎 {d.claimable.gems} + 🪙 {d.claimable.gold}</button>
          </Panel>
        )}
        <Panel className="overflow-x-auto p-2">
          <div className="flex items-center justify-between p-2">
            <h2 className="font-display text-xl text-gold">{t("⚔️ Guerra de Guildas")}</h2>
            <span className="rounded-full bg-ember/30 px-3 py-1 text-xs">{t("Termina em {tempo}", { tempo: fmtTime(d.endsInSec) })}</span>
          </div>
          {d.mine && <p className="mx-2 mb-2 rounded-lg bg-gold/10 px-3 py-2 text-sm">{t("Sua guilda está em")} <b>{d.mine.pos}º</b> {t("com")} <b>{d.mine.score}</b> {t("pontos.")}</p>}
          {d.rows.length === 0 ? <p className="p-6 text-center text-white/50">{t("Nenhuma guilda pontuou nesta semana ainda.")}</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-white/40"><tr><th className="p-3">#</th><th>{t("Guilda")}</th><th>{t("Nível")}</th><th>{t("Pontos")}</th></tr></thead>
              <tbody>
                {d.rows.map((r) => (
                  <tr key={r.tag} className={`border-t border-white/5 ${r.mine ? "bg-gold/10" : ""}`}>
                    <td className="p-3 font-display">{["🥇", "🥈", "🥉"][r.pos - 1] ?? r.pos}</td>
                    <td><span className="mr-2 rounded bg-white/10 px-1.5 text-xs font-bold text-gold">{r.tag}</span>{r.name}</td>
                    <td>{r.level}</td>
                    <td className="font-display text-gold">{r.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
      <div className="space-y-4">
        <Panel className="p-4 text-sm">
          <h3 className="font-display text-gold">{t("Como a guilda pontua")}</h3>
          <p className="mt-1 text-white/70">{t("Soma dos pontos semanais de todos os membros:")}</p>
          <ul className="mt-2 space-y-1">
            <li>{t("🏟️ Vitória na Arena:")} <b>{WEEKLY_POINTS.pvp_win}</b></li>
            <li>{t("👑 Chefe derrotado:")} <b>{WEEKLY_POINTS.boss_win}</b></li>
            <li>{t("📜 Missão:")} <b>{WEEKLY_POINTS.quest}</b> {t("· ⚔️ Caçada:")} <b>{WEEKLY_POINTS.pve_win}</b></li>
            <li>{t("🐉 Chefe da Guilda derrotado:")} <b>+200</b></li>
          </ul>
        </Panel>
        <Panel className="p-4 text-sm">
          <h3 className="font-display text-gold">{t("Prêmio para cada membro")}</h3>
          <ul className="mt-2 space-y-1">
            {GUILD_WAR_REWARDS.map((r) => <li key={r.rank} className="flex justify-between"><span>{["🥇 1º", "🥈 2º", "🥉 3º"][r.rank - 1]}</span><span>💎 {r.gems} + 🪙 {r.gold}</span></li>)}
          </ul>
          <p className="mt-2 text-[11px] text-white/40">{t("Vale para quem já estava na guilda antes do fim da semana. Resgate na semana seguinte.")}</p>
        </Panel>
      </div>
    </div>
  );
}
