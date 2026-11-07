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
import Smithy from "./Smithy";
import Skills from "./Skills";
import Ranking from "./Ranking";
import Shop from "./Shop";
import Goals from "./Goals";
import Avatar from "./Avatar";
import { post } from "./api";
import Tutorial from "./Tutorial";
import LevelUp from "./LevelUp";
import InstallButton from "./InstallButton";
import Guild from "./Guild";
import ChatDock from "./ChatDock";
import EventBanner from "./EventBanner";
import SeasonPass from "./SeasonPass";
import World from "./World";
import { CHAPTERS, trailLevel, trailOf } from "@/lib/game/story";

/** Há luta da história disponível agora (trecho ou chefe)? */
const CHAPTER_READY = (done: number, level: number, trail: number) => {
  const n = CHAPTERS.find((c) => c.n === done + 1);
  if (!n) return false;
  return trail < trailOf(n.n).length ? level >= trailLevel(n.n) : level >= n.minLevel;
};
import DailyLogin, { type LoginState } from "./DailyLogin";
import { isMuted, play, setMuted } from "./sfx";
import { useQuestAlerts } from "./notify";
import { LanguageSwitcher, useT } from "@/lib/i18n/client";

export type Toast = { id: number; text: string; kind: "ok" | "error" | "reward" };
export type GameCtx = {
  state: PlayerState;
  refresh: () => Promise<void>;
  toast: (text: string, kind?: Toast["kind"]) => void;
  /** Diferença relógio servidor − cliente, para timers visuais precisos. */
  skew: number;
  /** Vai para outra aba (ex.: "Ver no inventário" depois de uma vitória). */
  go?: (tab: string) => void;
};

const TABS = [
  { id: "overview", label: "Herói", icon: "🛡️" },
  { id: "world", label: "Mundo", icon: "🗺️" },
  { id: "goals", label: "Objetivos", icon: "🎯" },
  { id: "quests", label: "Missões", icon: "📜" },
  { id: "battle", label: "Caçada", icon: "⚔️" },
  { id: "arena", label: "Arena", icon: "🏟️" },
  { id: "guild", label: "Guilda", icon: "🏰" },
  { id: "skills", label: "Habilidades", icon: "✨" },
  { id: "inventory", label: "Inventário", icon: "🎒" },
  { id: "forge", label: "Forja", icon: "⚒️" },
  { id: "pass", label: "Passe", icon: "👑" },
  { id: "shop", label: "Loja", icon: "💎" },
  { id: "ranking", label: "Ranking", icon: "🏆" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function GameApp({ initial }: { initial: PlayerState }) {
  const t = useT();
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
    // Mensagens fixas (ex.: erros da API) são traduzidas aqui; as montadas já chegam traduzidas.
    setToasts((list) => [...list, { id, text: t(text), kind }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 4000);
  }, [t]);

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
  const energyHint = c.energy >= c.maxEnergy ? t("cheia") : t("+1 em {tempo}", { tempo: fmtTime(Math.max(0, c.nextEnergyInSec - elapsed)) });
  useEffect(() => {
    if (c.energy < c.maxEnergy && c.nextEnergyInSec - elapsed <= 0) refresh();
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const questReady = state.quest && new Date(state.quest.endsAt).getTime() <= Date.now() + skew;
  const ctx: GameCtx = { state, refresh, toast, skew, go: (id) => { if (TABS.some((x) => x.id === id)) setTab(id as TabId); } };
  const [muted, setMutedState] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const compact = new Intl.NumberFormat(t.locale, { notation: "compact", maximumFractionDigits: 1 });
  useEffect(() => setMutedState(isMuted()), []);
  useQuestAlerts(state.quest?.endsAt ?? null, skew);

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4">
      <header className="panel sticky top-2 z-30 flex flex-wrap items-center gap-2 px-3 py-2 backdrop-blur sm:gap-3 sm:px-4 sm:py-3">
        <Avatar src={c.portrait} frame={c.frame} size={44} />
        <div className="min-w-0 flex-1 sm:flex-none">
          <p className="truncate font-display leading-tight">{c.name}</p>
          <p className="truncate text-xs text-gold">{state.guild && <span className="mr-1 hidden rounded bg-white/10 px-1 font-semibold sm:inline">[{state.guild.tag}]</span>}{t("Nv.")} {c.level}{c.title ? <span className="ml-1 hidden text-amber-200/80 sm:inline">« {t(c.title)} »</span> : null}</p>
        </div>
        <div className="ml-auto hidden w-56 space-y-1 sm:block">
          <div title={t("Vida")}><Bar value={c.hp} max={c.maxHp} color="bg-life" inside /></div>
          <div title={`${t("Energia")} · ${energyHint}`}><Bar value={c.energy} max={c.maxEnergy} color="bg-energy" inside /></div>
        </div>

        {/* Celular: só o essencial; o resto fica no menu ☰. */}
        <div className="flex items-center gap-1 text-sm sm:hidden">
          <span title={`${t("Energia")} · ${energyHint}`} className="px-1">⚡{c.energy}</span>
          <span title={t("Ouro")} className="px-1">🪙<b>{compact.format(state.wallet.gold)}</b></span>
          <button onClick={() => setTab("shop")} aria-label={t("Gemas (premium) — comprar")} className="rounded-md bg-sky-500/15 px-1.5">💎<b>{compact.format(state.wallet.gems)}</b></button>
          <button onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label={t("Menu")}
            className={`relative rounded-md border border-white/15 text-lg ${menuOpen ? "bg-white/10" : ""}`}>
            ☰{login && !login.claimedToday && <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-gold" />}
          </button>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="w-full overflow-hidden sm:hidden">
              <div className="grid gap-2 border-t border-white/10 pt-2">
                <Bar value={c.hp} max={c.maxHp} color="bg-life" label={t("Vida")} />
                <Bar value={c.energy} max={c.maxEnergy} color="bg-energy" label={t("Energia")} hint={energyHint} />
                <div className="flex flex-wrap items-center gap-2">
                  {login && (
                    <button onClick={() => { setLoginOpen(true); setMenuOpen(false); }}
                      className={`rounded-md px-3 ${login.claimedToday ? "bg-white/5" : "bg-gold/20 ring-1 ring-gold"}`}>
                      🎁 {t("Recompensa diária")}{login.streak > 0 && <span className="ml-1 text-xs">🔥{login.streak}</span>}
                    </button>
                  )}
                  <button onClick={() => { setMuted(!muted); setMutedState(!muted); if (muted) play("click"); }}
                    className="rounded-md border border-white/15 px-3 text-sm">{muted ? `🔇 ${t("Ativar sons")}` : `🔊 ${t("Silenciar")}`}</button>
                  <InstallButton big />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <LanguageSwitcher compact />
                  <form action="/auth/signout" method="post"><button className="rounded-md border border-white/15 px-3 text-sm">{t("Sair")}</button></form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="hidden items-center gap-3 text-sm sm:flex">
          {login && (
            <button onClick={() => setLoginOpen(true)} title={t("Recompensa diária")}
              className={`relative rounded-md px-2 py-0.5 ${login.claimedToday ? "bg-white/5" : "bg-gold/20 ring-1 ring-gold animate-pulse"}`}>
              🎁{login.streak > 0 && <span className="ml-1 text-xs">🔥{login.streak}</span>}
            </button>
          )}
          <span title={t("Ouro")}>🪙 <b>{state.wallet.gold.toLocaleString(t.locale)}</b></span>
          <button onClick={() => setTab("shop")} title={t("Gemas (premium) — comprar")} className="rounded-md bg-sky-500/15 px-2 py-0.5 hover:bg-sky-500/25">💎 <b>{state.wallet.gems.toLocaleString(t.locale)}</b> <span className="text-sky-300">＋</span></button>
          <LanguageSwitcher compact />
          <InstallButton />
          <button onClick={() => { setMuted(!muted); setMutedState(!muted); if (muted) play("click"); }}
            title={muted ? t("Ativar sons") : t("Silenciar")} aria-label={muted ? t("Ativar sons") : t("Silenciar")}
            className="rounded-md border border-white/15 px-2 py-1 text-xs hover:bg-white/5">{muted ? "🔇" : "🔊"}</button>
          <form action="/auth/signout" method="post">
            <button className="rounded-md border border-white/15 px-2.5 py-1 text-xs hover:bg-white/5">{t("Sair")}</button>
          </form>
        </div>
      </header>

      <EventBanner />
      {/* Celular: abas deslizam para o lado (com sombra na borda indicando que há mais).
          Tablet e computador: 2 linhas iguais (7 + 6), nada cortado. */}
      <nav className="mt-3 flex gap-1 overflow-x-auto pb-1 pt-2 [mask-image:linear-gradient(to_right,#000_88%,transparent)] [scrollbar-width:none] sm:mt-4 sm:grid sm:grid-cols-7 sm:overflow-visible sm:[mask-image:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            onClick={() => { setTab(tb.id); setMenuOpen(false); play("click"); }}
            className={`relative min-h-11 shrink-0 rounded-lg whitespace-nowrap px-2 py-2 text-[12.5px] font-display transition ${tab === tb.id ? "text-ink" : "text-white/70 hover:text-white bg-white/5"}`}
          >
            {tab === tb.id && <motion.span layoutId="tab" className="absolute inset-0 -z-10 rounded-lg bg-gold" />}
            {tb.icon} {t(tb.label)}
            {tb.id === "quests" && questReady && <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-emerald-400" />}
            {tb.id === "battle" && state.battle && <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-ember" />}
            {tb.id === "world" && CHAPTER_READY(c.storyChapter, c.level, c.storyTrail ?? 0) && <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-gold" />}
            {tb.id === "goals" && goalsReady > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">{goalsReady}</span>}
            {tb.id === "overview" && c.attributePoints > 0 && <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-arcane" />}
          </button>
        ))}
      </nav>

      {/* Espaço no fim para o botão flutuante do chat (canto inferior) não cobrir botões — celular E computador. */}
      <main className="mt-4 pb-24">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
            {tab === "overview" && <Overview ctx={ctx} energyHint={energyHint} />}
            {tab === "quests" && <Quests ctx={ctx} />}
            {tab === "battle" && <Battle ctx={ctx} />}
            {tab === "arena" && <Arena ctx={ctx} />}
            {tab === "inventory" && <Inventory ctx={ctx} />}
            {tab === "forge" && <Smithy ctx={ctx} />}
            {tab === "skills" && <Skills ctx={ctx} />}
            {tab === "ranking" && <Ranking ctx={ctx} />}
            {tab === "shop" && <Shop ctx={ctx} />}
            {tab === "guild" && <Guild ctx={ctx} />}
            {tab === "pass" && <SeasonPass ctx={ctx} />}
            {tab === "world" && <World ctx={ctx} onBattle={() => setTab("battle")} />}
            {tab === "goals" && <Goals ctx={ctx} onCount={setGoalsReady} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <ChatDock ctx={ctx} hideFabOnMobile={tab === "battle" && !!state.battle} />
      <LevelUp level={levelUp?.to ?? null} from={levelUp?.from ?? 0} onClose={() => setLevelUp(null)}
        onSpend={() => { setLevelUp(null); setTab("overview"); }} />
      <Tutorial name={c.name} onNavigate={setTab} onDone={() => setTutorialDone(true)} />
      {login && (
        <DailyLogin ctx={ctx} login={login} open={loginOpen} onClose={() => setLoginOpen(false)}
          onClaimed={() => setLogin({ claimedToday: true, streak: login.claimedToday ? login.streak : login.streak + 1 })} />
      )}

      <div className="pointer-events-none fixed inset-x-3 top-3 z-[60] flex flex-col gap-2 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-auto sm:w-72">
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
