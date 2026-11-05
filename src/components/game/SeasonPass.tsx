"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import { PASS_POINTS, PASS_PRICE_GEMS, PASS_REWARDS, PASS_TIER_POINTS, PASS_TIERS, PREMIUM_TOTAL_GEMS, PASS_DUNGEON_BONUS, type PassReward } from "@/lib/game/seasonPass";
import { fmtTime, post } from "./api";
import { Bar, Panel } from "./ui";
import { play } from "./sfx";

type Data = { season: { id: string; name: string; endsInSec: number }; points: number; tier: number; premium: boolean; claimed: string[] };

export default function SeasonPass({ ctx }: { ctx: GameCtx }) {
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/pass", { cache: "no-store" });
    if (r.ok) setD(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);
  // Rola até o nível atual.
  useEffect(() => {
    if (!d || !scroller.current) return;
    const el = scroller.current.querySelector<HTMLElement>(`[data-tier="${Math.max(1, d.tier)}"]`);
    if (el) scroller.current.scrollLeft = el.offsetLeft - 80;
  }, [d?.tier]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(url: string, body: object, ok: string) {
    setBusy(true);
    try {
      await post(url, body);
      play("coin");
      ctx.toast(ok, "reward");
      await Promise.all([load(), ctx.refresh()]);
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (!d) return <p className="text-white/50">Carregando passe…</p>;
  const inTier = d.tier >= PASS_TIERS ? PASS_TIER_POINTS : d.points % PASS_TIER_POINTS;
  const claimable = PASS_REWARDS.filter((r) => r.tier <= d.tier).reduce((n, r) =>
    n + (d.claimed.includes(`${r.tier}:free`) ? 0 : 1) + (d.premium && !d.claimed.includes(`${r.tier}:premium`) ? 1 : 0), 0);

  async function claimAll() {
    setBusy(true);
    let n = 0;
    for (const r of PASS_REWARDS.filter((x) => x.tier <= d!.tier)) {
      for (const track of ["free", "premium"] as const) {
        if (track === "premium" && !d!.premium) continue;
        if (d!.claimed.includes(`${r.tier}:${track}`)) continue;
        try { await post("/api/pass/claim", { tier: r.tier, track }); n++; } catch { /* segue */ }
      }
    }
    play("victory");
    ctx.toast(`🎁 ${n} recompensa(s) resgatada(s)!`, "reward");
    await Promise.all([load(), ctx.refresh()]);
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      <Panel className="relative overflow-hidden p-6">
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-fuchsia-900/40 via-transparent to-amber-900/30" />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.25em] text-white/60">Passe de Temporada</p>
            <h2 className="font-display text-3xl capitalize text-gold">{d.season.name}</h2>
            <p className="text-sm text-white/60">Termina em {fmtTime(d.season.endsInSec)} · Nível <b className="text-white">{d.tier}</b>/{PASS_TIERS}</p>
            <div className="mt-3 max-w-md"><Bar value={inTier} max={PASS_TIER_POINTS} color="bg-gradient-to-r from-fuchsia-500 to-gold" label={d.tier >= PASS_TIERS ? "Passe completo!" : `Próximo nível: ${inTier}/${PASS_TIER_POINTS} pontos`} /></div>
          </div>
          <div className="flex flex-col items-stretch gap-2">
            {claimable > 0 && <button className="btn-gold" disabled={busy} onClick={claimAll}>Resgatar tudo ({claimable})</button>}
            {!d.premium ? (
              <motion.button whileHover={{ scale: 1.03 }} disabled={busy || ctx.state.wallet.gems < PASS_PRICE_GEMS}
                onClick={() => run("/api/pass/buy", {}, "👑 Passe Premium ativado!")}
                className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-amber-500 px-5 py-3 text-left font-display shadow-lg disabled:opacity-50">
                <span className="block text-lg">👑 Ativar Premium · 💎 {PASS_PRICE_GEMS}</span>
                <span className="block text-xs font-sans text-white/80">Devolve 💎 {PREMIUM_TOTAL_GEMS} ao completar · 2 pets · moldura e título</span>
              </motion.button>
            ) : <span className="rounded-lg bg-fuchsia-600/30 px-4 py-2 text-center font-display text-sm">👑 Premium ativo · +{PASS_DUNGEON_BONUS} entrada diária nas masmorras</span>}
          </div>
        </div>
      </Panel>

      <Panel className="p-3">
        <div ref={scroller} className="overflow-x-auto pb-2">
          <div className="grid w-max grid-flow-col gap-2" style={{ gridTemplateRows: "auto auto auto" }}>
            {PASS_REWARDS.map((r) => {
              const reached = r.tier <= d.tier;
              return (
                <div key={r.tier} data-tier={r.tier} className="contents">
                  <div className={`text-center font-display text-sm ${reached ? "text-gold" : "text-white/40"}`}>{r.tier}</div>
                  <Cell reward={r.free} reached={reached} claimed={d.claimed.includes(`${r.tier}:free`)} locked={false} busy={busy}
                    onClaim={() => run("/api/pass/claim", { tier: r.tier, track: "free" }, `🎁 ${r.free.label}`)} />
                  <Cell reward={r.premium} reached={reached} claimed={d.claimed.includes(`${r.tier}:premium`)} locked={!d.premium} premium busy={busy}
                    onClaim={() => run("/api/pass/claim", { tier: r.tier, track: "premium" }, `👑 ${r.premium.label}`)} />
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-1 flex gap-4 text-[11px] text-white/50"><span>Linha de cima: grátis</span><span>Linha de baixo: 👑 premium</span></div>
      </Panel>

      <Panel className="p-4 text-sm">
        <h3 className="font-display text-gold">Como ganhar pontos do passe</h3>
        <ul className="mt-2 grid gap-1 sm:grid-cols-5">
          <li>📜 Missão: <b>{PASS_POINTS.quest}</b></li>
          <li>👑 Chefe: <b>{PASS_POINTS.boss_win}</b></li>
          <li>🎁 Login do dia: <b>{PASS_POINTS.login}</b></li>
          <li>🏟️ Duelo na Arena: <b>{PASS_POINTS.pvp}</b></li>
          <li>⚔️ Caçada vencida: <b>{PASS_POINTS.pve_win}</b></li>
        </ul>
        <p className="mt-2 text-[11px] text-white/40">Cada {PASS_TIER_POINTS} pontos = 1 nível. A temporada dura o mês inteiro (UTC); recompensas não resgatadas expiram no fim do mês.</p>
      </Panel>
    </div>
  );
}

function Cell({ reward, reached, claimed, locked, premium, busy, onClaim }: { reward: PassReward; reached: boolean; claimed: boolean; locked: boolean; premium?: boolean; busy: boolean; onClaim: () => void }) {
  const can = reached && !claimed && !locked;
  return (
    <button disabled={!can || busy} onClick={onClaim} title={reward.label}
      className={`relative flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-lg p-2 text-center text-[11px] transition
        ${premium ? "bg-gradient-to-b from-fuchsia-900/50 to-black/40" : "bg-black/40"}
        ${can ? "ring-2 ring-gold hover:-translate-y-0.5" : ""} ${claimed ? "opacity-40" : ""} ${!reached ? "opacity-60" : ""}`}>
      {reward.icon ? <Image src={reward.icon} alt="" width={44} height={44} className="rounded" /> : <span className="text-2xl">{reward.cosmetic ? "🖼️" : "🪙"}</span>}
      <span className="leading-tight">{reward.label}</span>
      {claimed && <span className="absolute right-1 top-1 text-emerald-300">✔</span>}
      {locked && <span className="absolute right-1 top-1">🔒</span>}
    </button>
  );
}
