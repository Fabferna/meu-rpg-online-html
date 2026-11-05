"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import Shop from "./Shop";
import Goals from "./Goals";
import Avatar from "./Avatar";
import { post } from "./api";
import Tutorial from "./Tutorial";
import LevelUp from "./LevelUp";
import InstallButton from "./InstallButton";
import DailyLogin, { type LoginState } from "./DailyLogin";
import { isMuted, play, setMuted } from "./sfx";
import { useQuestAlerts } from "./notify";

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
  { id: "goals", label: "Objetivos", icon: "🎯" },
  { id: "quests", label: "Missões", icon: "📜" },
  { id: "battle", label: "Caçada", icon: "⚔️" },
  { id: "arena", label: "Arena PVP", icon: "🏟️" },
  { id: "inventory", label: "Inventário", icon: "🎒" },
  { id: "shop", label: "Loja", icon: "💎" },
  { id: "ranking", label: "Ranking", icon: "🏆" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function GameApp({ initial }: { initial: PlayerState }) {
  const [state, setState] = useState(initial);
  const [tab, setTab] = useState<TabId>(initial.battle ? "battle" : "overview");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [skew, setSkew] = useState(() => new Date(initial.serverTime).getTime() - Date.now());
  const [tick, setTick] = useState(0);
  const [goalsReady, setGoalsReady] = useState(0);
  const [login, setLogin] = useState<LoginState | null>(null);
  const [tutorialDone, setTutorialDone] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [levelUp, setLevelUp] = useState<{ to: number; from: number } | null>(null);
  const lastLevel = useRef(initial.character.level);

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

  // Detecta subida de nível em qualquer lugar do jogo (missão, caçada, PVP, objetivos).
  useEffect(() => {
    const lv = state.character.level;
    if (lv > lastLevel.current) {
      const from = lastLevel.current;
      setTimeout(() => { setLevelUp({ to: lv, from }); play("levelup"); }, 1200); // deixa o resultado da luta aparecer antes
    }
    lastLevel.current = lv;
  }, [state.character.level]);

  // Estado do login diário; a janela abre sozinha depois do tutorial.
  useEffect(() => {
    fetch("/api/shop", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((sh) => sh && setLogin(sh.login)).catch(() => {});
  }, []);
  useEffect(() => {
    if (tutorialDone && login && !login.claimedToday) setLoginOpen(true);
  }, [tutorialDone, login?.claimedToday]); // eslint-disable-line react-hooks/exhaustive-deps

  // Selo com quantos objetivos estão prontos para resgatar.
  useEffect(() => {
    fetch("/api/goals", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((g) => {
      if (!g) return;
      const n = g.daily.filter((d: { claimed: boolean; progress: number; target: number }) => !d.claimed && d.progress >= d.target).length
        + g.achievements.filter((a: { claimed: boolean; progress: number; target: number }) => !a.claimed && a.progress >= a.target).length;
      setGoalsReady(n);
    }).catch(() => {});
  }, [state.serverTime]);

  // Retorno do checkout. As gemas são creditadas pelo WEBHOOK, não aqui.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const status = q.get("pagamento");
    if (!status) return;
    window.history.replaceState(null, "", "/jogo");
    setTab("shop");
    if (status === "dev" && q.get("id")) {
      post("/api/shop/dev-complete", { paymentId: q.get("id") }).then(() => { toast("💎 Pagamento de teste aprovado!", "reward"); refresh(); })
        .catch((e) => toast((e as Error).message, "error"));
    } else if (status === "sucesso") {
      toast("💎 Pagamento recebido! Suas gemas chegam em instantes.", "reward");
      [3000, 8000, 15000].forEach((ms) => setTimeout(refresh, ms));
    } else if (status === "pendente") {
      toast("Pagamento pendente. Assim que for confirmado, as gemas aparecem aqui.");
    } else {
      toast("Pagamento cancelado.", "error");
    }
  }, [refresh, toast]);

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
  const [muted, setMutedState] = useState(false);
  useEffect(() => setMutedState(isMuted()), []);
  useQuestAlerts(state.quest?.endsAt ?? null, skew);

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4">
      <header className="panel sticky top-2 z-30 flex flex-wrap items-center gap-3 px-4 py-3 backdrop-blur">
        <Avatar src={c.portrait} frame={c.frame} size={48} />
        <div className="min-w-0">
          <p className="truncate font-display leading-tight">{c.name}</p>
          <p className="text-xs text-gold">Nv. {c.level}{c.title ? <span className="ml-1 text-amber-200/80">« {c.title} »</span> : null}</p>
        </div>
        <div className="ml-auto hidden w-56 space-y-1 sm:block">
          <Bar value={c.hp} max={c.maxHp} color="bg-life" />
          <Bar value={c.energy} max={c.maxEnergy} color="bg-energy" />
        </div>
        <div className="flex items-center gap-3 text-sm">
          {login && (
            <button onClick={() => setLoginOpen(true)} title="Recompensa diária"
              className={`relative rounded-md px-2 py-0.5 ${login.claimedToday ? "bg-white/5" : "bg-gold/20 ring-1 ring-gold animate-pulse"}`}>
              🎁{login.streak > 0 && <span className="ml-1 text-xs">🔥{login.streak}</span>}
            </button>
          )}
          <span title={`Energia · ${energyHint}`} className="sm:hidden">⚡ {c.energy}</span>
          <span title="Ouro">🪙 <b>{state.wallet.gold.toLocaleString("pt-BR")}</b></span>
          <button onClick={() => setTab("shop")} title="Gemas (premium) — comprar" className="rounded-md bg-sky-500/15 px-2 py-0.5 hover:bg-sky-500/25">💎 <b>{state.wallet.gems.toLocaleString("pt-BR")}</b> <span className="text-sky-300">＋</span></button>
          <InstallButton />
          <button onClick={() => { setMuted(!muted); setMutedState(!muted); if (muted) play("click"); }}
            title={muted ? "Ativar sons" : "Silenciar"} aria-label={muted ? "Ativar sons" : "Silenciar"}
            className="rounded-md border border-white/15 px-2 py-1 text-xs hover:bg-white/5">{muted ? "🔇" : "🔊"}</button>
          <form action="/auth/signout" method="post">
            <button className="rounded-md border border-white/15 px-2.5 py-1 text-xs hover:bg-white/5">Sair</button>
          </form>
        </div>
      </header>

      <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); play("click"); }}
            className={`relative shrink-0 rounded-lg px-4 py-2 text-sm font-display transition ${tab === t.id ? "text-ink" : "text-white/70 hover:text-white bg-white/5"}`}
          >
            {tab === t.id && <motion.span layoutId="tab" className="absolute inset-0 -z-10 rounded-lg bg-gold" />}
            {t.icon} {t.label}
            {t.id === "quests" && questReady && <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-emerald-400" />}
            {t.id === "battle" && state.battle && <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-ember" />}
            {t.id === "goals" && goalsReady > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">{goalsReady}</span>}
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
            {tab === "ranking" && <Ranking ctx={ctx} />}
            {tab === "shop" && <Shop ctx={ctx} />}
            {tab === "goals" && <Goals ctx={ctx} onCount={setGoalsReady} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <LevelUp level={levelUp?.to ?? null} from={levelUp?.from ?? 0} onClose={() => setLevelUp(null)}
        onSpend={() => { setLevelUp(null); setTab("overview"); }} />
      <Tutorial name={c.name} onNavigate={setTab} onDone={() => setTutorialDone(true)} />
      {login && (
        <DailyLogin ctx={ctx} login={login} open={loginOpen} onClose={() => setLoginOpen(false)}
          onClaimed={() => setLogin({ claimedToday: true, streak: login.claimedToday ? login.streak : login.streak + 1 })} />
      )}

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
