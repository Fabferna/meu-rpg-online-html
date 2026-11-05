"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import type { PlayerState } from "@/lib/game/state";
import { fmtTime } from "./api";
import { Bar } from "./ui";
import Overview from "./Overview";
import Quests from "./Quests";
import Battle from "./Battle";
import Arena from "./Arena";
import Inventory from "./Inventory";
import Ranking from "./Ranking";

export type Toast = { id: number; text: string; kind: "ok" | "error" | "reward" };
export type GameCtx = {
  state: PlayerState;
  refresh: () => Promise<void>;
  toast: (text: string, kind?: Toast["kind"]) => void;
  /** Diferença relógio servidor − cliente, para timers visuais precisos. */
  skew: number;
};

const TABS = [
  { id: "overview", label: "Herói", icon: "🛡️" },
  { id: "quests", label: "Missões", icon: "📜" },
  { id: "battle", label: "Caçada", icon: "⚔️" },
  { id: "arena", label: "Arena PVP", icon: "🏟️" },
  { id: "inventory", label: "Inventário", icon: "🎒" },
  { id: "ranking", label: "Ranking", icon: "🏆" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function GameApp({ initial }: { initial: PlayerState }) {
  const [state, setState] = useState(initial);
  const [tab, setTab] = useState<TabId>(initial.battle ? "battle" : "overview");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [skew, setSkew] = useState(() => new Date(initial.serverTime).getTime() - Date.now());
  const [tick, setTick] = useState(0);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (!res.ok) return;
    const fresh: PlayerState = await res.json();
    setSkew(new Date(fresh.serverTime).getTime() - Date.now());
    setState(fresh);
  }, []);

  const toast = useCallback((text: string, kind: Toast["kind"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  // Relógio visual de 1s; sincroniza com o servidor a cada 60s ou quando ganharia energia.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    const r = setInterval(refresh, 60_000);
    return () => { clearInterval(t); clearInterval(r); };
  }, [refresh]);

  const c = state.character;
  const elapsed = Math.floor((Date.now() + skew - new Date(state.serverTime).getTime()) / 1000);
  const energyHint = c.energy >= c.maxEnergy ? "cheia" : `+1 em ${fmtTime(Math.max(0, c.nextEnergyInSec - elapsed))}`;
  useEffect(() => {
    if (c.energy < c.maxEnergy && c.nextEnergyInSec - elapsed <= 0) refresh();
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const questReady = state.quest && new Date(state.quest.endsAt).getTime() <= Date.now() + skew;
  const ctx: GameCtx = { state, refresh, toast, skew };

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4">
      <header className="panel sticky top-2 z-30 flex flex-wrap items-center gap-3 px-4 py-3 backdrop-blur">
        <div className="relative h-11 w-11 overflow-hidden rounded-full ring-2 ring-gold/60">
          <Image src={c.portrait} alt="" fill sizes="44px" className="object-cover" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display leading-tight">{c.name}</p>
          <p className="text-xs text-gold">Nv. {c.level}</p>
        </div>
        <div className="ml-auto hidden w-56 space-y-1 sm:block">
          <Bar value={c.hp} max={c.maxHp} color="bg-life" />
          <Bar value={c.energy} max={c.maxEnergy} color="bg-energy" />
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span title={`Energia · ${energyHint}`} className="sm:hidden">⚡ {c.energy}</span>
          <span title="Ouro">🪙 <b>{state.wallet.gold.toLocaleString("pt-BR")}</b></span>
          <span title="Gemas (premium)">💎 <b>{state.wallet.gems.toLocaleString("pt-BR")}</b></span>
          <form action="/auth/signout" method="post">
            <button className="rounded-md border border-white/15 px-2.5 py-1 text-xs hover:bg-white/5">Sair</button>
          </form>
        </div>
      </header>

      <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative shrink-0 rounded-lg px-4 py-2 text-sm font-display transition ${tab === t.id ? "text-ink" : "text-white/70 hover:text-white bg-white/5"}`}
          >
            {tab === t.id && <motion.span layoutId="tab" className="absolute inset-0 -z-10 rounded-lg bg-gold" />}
            {t.icon} {t.label}
            {t.id === "quests" && questReady && <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-emerald-400" />}
            {t.id === "battle" && state.battle && <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-ember" />}
            {t.id === "overview" && c.attributePoints > 0 && <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-arcane" />}
          </button>
        ))}
      </nav>

      <main className="mt-4">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
            {tab === "overview" && <Overview ctx={ctx} energyHint={energyHint} />}
            {tab === "quests" && <Quests ctx={ctx} />}
            {tab === "battle" && <Battle ctx={ctx} />}
            {tab === "arena" && <Arena ctx={ctx} />}
            {tab === "inventory" && <Inventory ctx={ctx} />}
            {tab === "ranking" && <Ranking />}
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-72 flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              className={`rounded-lg px-4 py-3 text-sm shadow-xl ${t.kind === "error" ? "bg-red-900/90" : t.kind === "reward" ? "bg-gradient-to-r from-amber-600 to-yellow-500 text-ink font-semibold" : "bg-panel-2/95 ring-1 ring-white/10"}`}>
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
