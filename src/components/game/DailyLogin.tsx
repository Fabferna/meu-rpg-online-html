"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import { DAILY_LOGIN, LOGIN_MILESTONES } from "@/lib/shop/catalog";
import { post } from "./api";
import { play } from "./sfx";

export type LoginState = { claimedToday: boolean; streak: number };
type Result = { streak: number; day: number; gold: number; gems: number; potions: number; milestone: string | null };

/** Janela da recompensa diária. Abre sozinha quando ainda não foi resgatada hoje. */
export default function DailyLogin({ ctx, login, open, onClose, onClaimed }: {
  ctx: GameCtx; login: LoginState; open: boolean; onClose: () => void; onClaimed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => { if (open) setResult(null); }, [open]);

  // Dia do ciclo de hoje (1..7) e se a sequência continua.
  const todayStreak = login.claimedToday ? login.streak : login.streak + 1;
  const todayDay = ((todayStreak - 1) % 7) + 1;
  const current = result?.streak ?? login.streak; // dias seguidos já resgatados
  const next = LOGIN_MILESTONES.find((m) => m.streak > current);

  async function claim() {
    setBusy(true);
    try {
      const r = await post<Result>("/api/daily-login");
      setResult(r);
      play(r.milestone ? "levelup" : "victory");
      onClaimed();
      ctx.refresh();
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[55] grid place-items-center bg-black/75 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => !busy && onClose()}>
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="panel max-h-[92dvh] w-full max-w-lg overflow-y-auto p-5 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="dl-title"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="dl-title" className="font-display text-2xl text-gold">Recompensa Diária</h2>
                <p className="text-sm text-white/60">
                  {login.streak > 0 && !result ? <>Sequência atual: <b className="text-white">{login.streak} dia(s)</b> 🔥</> : "Entre todos os dias para prêmios maiores!"}
                </p>
              </div>
              <button onClick={onClose} aria-label="Fechar" className="rounded-md px-2 text-white/50 hover:text-white">✕</button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-7">
              {DAILY_LOGIN.map((d) => {
                const done = d.day < todayDay || ((login.claimedToday || result) && d.day === todayDay);
                const isToday = d.day === todayDay;
                return (
                  <motion.div key={d.day} animate={isToday && !done ? { scale: [1, 1.06, 1] } : {}} transition={{ repeat: Infinity, duration: 1.4 }}
                    className={`relative rounded-lg p-2 text-center text-[11px] ${d.day === 7 ? "col-span-3 sm:col-span-1" : ""}
                      ${done ? "bg-emerald-800/50" : isToday ? "bg-gold/25 ring-2 ring-gold" : "bg-black/30"}`}>
                    <p className="text-white/60">Dia {d.day}</p>
                    {d.day === 7 ? <Image src="/assets/shop/gems_large.webp" alt="" width={36} height={36} className="mx-auto my-1 rounded" /> :
                      d.gems ? <Image src="/assets/shop/gems_small.webp" alt="" width={28} height={28} className="mx-auto my-1 rounded" /> :
                      d.potions ? <Image src="/assets/shop/potion_hp.webp" alt="" width={28} height={28} className="mx-auto my-1 rounded" /> :
                      <p className="my-1 text-xl">🪙</p>}
                    <p>🪙{d.gold}</p>
                    {d.gems ? <p className="text-sky-300">💎{d.gems}</p> : d.potions ? <p>🧪{d.potions}</p> : null}
                    {done && <span className="absolute right-1 top-1 text-emerald-300">✔</span>}
                  </motion.div>
                );
              })}
            </div>

            {result ? (
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }} className="mt-6 text-center">
                <p className="font-display text-xl text-gold">Dia {result.day} resgatado!</p>
                <p className="mt-2 text-lg">
                  +{result.gold} 🪙{result.gems ? ` · +${result.gems} 💎` : ""}{result.potions ? ` · +${result.potions} 🧪` : ""}
                </p>
                {result.milestone && (
                  <p className="mt-2 rounded-lg bg-arcane/30 px-3 py-2 text-sm">
                    🎉 Marco de {result.streak} dias seguidos! {LOGIN_MILESTONES.find((m) => m.streak === result.streak)?.reward}
                  </p>
                )}
                <p className="mt-2 text-sm text-white/60">Sequência: {result.streak} dia(s) 🔥 · volte amanhã!</p>
                <button className="btn-gold mt-5 w-full" onClick={onClose}>Continuar</button>
              </motion.div>
            ) : login.claimedToday ? (
              <p className="mt-6 text-center text-sm text-white/60">Você já resgatou hoje. A próxima recompensa libera à meia-noite (UTC).</p>
            ) : (
              <button className="btn-gold mt-6 w-full text-lg" disabled={busy} onClick={claim}>
                {busy ? "Abrindo…" : `Resgatar Dia ${todayDay}`}
              </button>
            )}

            <div className="mt-5 rounded-lg bg-black/30 p-3 text-xs">
              <p className="text-white/50">Bônus por dias seguidos{next ? ` · próximo: ${next.label} (faltam ${next.streak - current} dia(s))` : ""}</p>
              <ul className="mt-1.5 grid gap-1 sm:grid-cols-3">
                {LOGIN_MILESTONES.map((m) => (
                  <li key={m.streak} className={current >= m.streak ? "text-emerald-300" : "text-white/80"}>
                    {current >= m.streak ? "✔" : "◇"} {m.streak} dias: {m.reward}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-white/40">Se ficar um dia sem entrar, a sequência recomeça do Dia 1.</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
