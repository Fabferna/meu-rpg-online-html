"use client";

import { useState } from "react";
import type { GameCtx } from "./GameApp";
import { BRANCHES, TALENTS, TIER_REQ, canLearn, spent, spentIn, talentPoints, talentResetCost } from "@/lib/game/talents";
import { post } from "./api";
import { Panel } from "./ui";
import { play } from "./sfx";
import { useT } from "@/lib/i18n/client";

/** Árvore de talentos (aba Habilidades). A validação de verdade é feita no servidor (/api/talents). */
export default function TalentTree({ ctx }: { ctx: GameCtx }) {
  const t = useT();
  const c = ctx.state.character;
  const r = c.talents ?? {};
  const total = talentPoints(c.level), used = spent(r), free = total - used;
  const [busy, setBusy] = useState(false);

  async function send(body: object, ok?: string) {
    setBusy(true);
    try {
      await post("/api/talents", body);
      play("skill");
      if (ok) ctx.toast(ok, "reward");
      await ctx.refresh();
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }
  const reset = () => {
    const cost = talentResetCost(c.level);
    if (confirm(t("Devolver todos os {n} pontos de talento por 🪙 {g}?", { n: used, g: cost }))) send({ action: "reset" }, t("Pontos de talento devolvidos!"));
  };

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl text-gold">{t("🌳 Árvore de talentos")}</h2>
        <div className="flex items-center gap-3 text-sm">
          <span className={free > 0 ? "text-emerald-300" : "text-white/60"}>{t("Pontos livres: {a} de {b}", { a: free, b: total })}</span>
          {used > 0 && <button disabled={busy || ctx.state.wallet.gold < talentResetCost(c.level)} onClick={reset} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15">{t("Redistribuir · 🪙 {g}", { g: talentResetCost(c.level) })}</button>}
        </div>
      </div>
      <p className="mt-1 text-xs text-white/60">{t("Você ganha 1 ponto por nível a partir do nível 3. Gaste pontos num ramo para abrir os andares seguintes. Talentos lado a lado com ⚔ se excluem: escolha um OU outro.")}</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {BRANCHES.map((b) => {
          const inB = spentIn(r, b.id);
          return (
            <div key={b.id} className="rounded-xl bg-black/30 p-3 ring-1 ring-white/10">
              <p className={`mb-2 font-display text-lg ${b.color}`}>{b.icon} {t(b.name)} <span className="text-xs text-white/50">({inB})</span></p>
              {([1, 2, 3, 4] as const).map((tier) => {
                const nodes = TALENTS.filter((x) => x.branch === b.id && x.tier === tier);
                const open = inB >= TIER_REQ[tier];
                return (
                  <div key={tier} className="mb-2">
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
                      {t("Andar {n}", { n: tier })}{!open && ` · 🔒 ${t("gaste {n} pontos em {x}", { n: TIER_REQ[tier], x: t(b.name) })}`}
                    </p>
                    <div className={`grid gap-2 ${nodes.length > 1 ? "grid-cols-2" : ""}`}>
                      {nodes.map((n, i) => {
                        const rank = r[n.id] ?? 0;
                        const can = canLearn(r, n.id, c.level).ok;
                        return (
                          <button key={n.id} disabled={busy || !can} onClick={() => send({ action: "learn", id: n.id })}
                            title={t(n.description)}
                            className={`relative min-h-11 rounded-lg p-2 text-left ring-1 transition disabled:cursor-not-allowed ${rank > 0 ? "bg-gold/10 ring-gold/60" : can ? "bg-white/5 ring-emerald-400/50 hover:bg-white/10" : "bg-white/5 ring-white/10 opacity-60"}`}>
                            {nodes.length > 1 && i === 1 && <span className="absolute -left-2 top-1/2 -translate-y-1/2 text-[10px] text-white/40">⚔</span>}
                            <p className="text-xs font-semibold leading-tight">{t(n.name)}</p>
                            <p className="mt-0.5 text-[10px] leading-snug text-white/60">{t(n.description)}</p>
                            <p className={`mt-1 text-[11px] ${rank >= n.maxRank ? "text-gold" : "text-white/50"}`}>{rank}/{n.maxRank}{can ? " · +1" : ""}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
