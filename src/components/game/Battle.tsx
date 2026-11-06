"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import type { GameCtx } from "./GameApp";
import type { BattleState, LogEntry, PlayerAction } from "@/lib/game/combat";
import type { TFn } from "@/lib/i18n/translate";
import { ENEMIES, ENEMY_BY_ID } from "@/lib/game/enemies";
import { HUNT_REFILL, PVE_ENERGY_COST, xpRate } from "@/lib/game/rules";
import { SKILL_BY_ID, skillPower } from "@/lib/game/skills";
import Dungeons from "./Dungeons";
import { ITEM_BY_ID } from "@/lib/game/items";
import { REGION_OF_ENEMY, regionUnlocked } from "@/lib/game/regions";
import { post } from "./api";
import { play } from "./sfx";
import { Bar, Panel } from "./ui";
import { useT } from "@/lib/i18n/client";

type Result = { outcome: "won" | "lost"; state: BattleState };
type Float = { id: number; side: "player" | "enemy"; text: string; color: string };

export default function Battle({ ctx }: { ctx: GameCtx }) {
  const t = useT();
  const { state } = ctx;
  const [battle, setBattle] = useState<BattleState | null>(state.battle?.state ?? null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [floats, setFloats] = useState<Float[]>([]);
  const [enemyRef, animateEnemy] = useAnimate();
  const [mode, setMode] = useState<"hunt" | "dungeon">("hunt");
  const [playerRef, animatePlayer] = useAnimate();

  async function start(enemyId: string) {
    setBusy(true);
    try {
      await post("/api/battle/start", { enemyId });
      await ctx.refresh();
      const res = await fetch("/api/state", { cache: "no-store" }).then((r) => r.json());
      setBattle(res.battle?.state ?? null);
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  function showFloats(entries: LogEntry[]) {
    const fl: Float[] = entries.map((l, i) => {
      const target = l.target ?? (l.action === "defend" || l.action === "potion" || ((l.action === "racial" || l.action === "skill") && l.heal && !l.dmg) ? l.actor : l.actor === "player" ? "enemy" : "player");
      const text = l.action === "stunned" ? t("Atordoado!") : l.miss ? t("Esquivou!") : l.heal ? `+${l.heal}` : l.action === "poison" ? `☠️ -${l.dmg}` : `${l.crit ? `${t("CRÍTICO")} ` : ""}-${l.dmg}`;
      const color = l.action === "poison" ? "text-lime-300" : l.action === "stunned" ? "text-sky-300" : l.heal ? "text-emerald-300" : l.crit ? "text-amber-300 text-3xl" : l.miss ? "text-white/70" : "text-red-400";
      return { id: Date.now() + i, side: target, text, color };
    });
    setFloats((f) => [...f, ...fl]);
    setTimeout(() => setFloats((f) => f.filter((x) => !fl.includes(x))), 1200);
    entries.forEach((l, i) => setTimeout(() => {
      if (l.action === "stunned") play("miss");
      else if (l.action === "poison") play("hurt");
      else if (l.action === "racial") play(l.heal ? "defend" : "skill");
      else if (l.action === "defend") play("defend");
      else if (l.action === "potion") play("heal");
      else if (l.miss) play("miss");
      else if (l.actor === "player") play(l.action === "skill" ? "skill" : l.crit ? "crit" : "hit");
      else play(l.crit ? "crit" : "hurt");
    }, i * 260));
    for (const l of entries) {
      if (l.dmg && !l.miss && l.action !== "poison") {
        const ref = l.actor === "player" ? enemyRef : playerRef;
        const anim = l.actor === "player" ? animateEnemy : animatePlayer;
        if (ref.current) anim(ref.current, { x: [0, -10, 10, -6, 6, 0] }, { duration: 0.35 });
      }
    }
  }

  async function act(action: PlayerAction) {
    if (!battle) return;
    setBusy(true);
    try {
      const res = await post<{ outcome: "won" | "lost" | "active"; state: BattleState; stageCleared?: { stage: number; rewards?: { xp: number; gold: number } } }>("/api/battle/action", { action });
      if (res.stageCleared) {
        play("victory");
        ctx.toast(t("🗝️ Estágio {n} vencido! +{xp} XP · +{gold} 🪙 — você descansa (+25% de vida) e segue!", { n: res.stageCleared.stage, xp: res.stageCleared.rewards?.xp ?? 0, gold: res.stageCleared.rewards?.gold ?? 0 }), "reward");
        setBattle(res.state);
        ctx.refresh();
        return;
      }
      showFloats(res.state.log.filter((l) => l.turn === res.state.turn));
      setBattle(res.state);
      if (res.outcome !== "active") {
        setTimeout(() => {
          setResult({ outcome: res.outcome as "won" | "lost", state: res.state });
          play(res.outcome === "won" ? "victory" : "defeat");
        }, 600);
        await ctx.refresh();
      } else if (action === "potion") {
        await ctx.refresh();
      }
    } catch (e) {
      ctx.toast((e as Error).message, "error");
      // A tela pode ter ficado para trás (outra aba, clique duplo, luta já encerrada): busca o estado real.
      await resync();
    } finally {
      setBusy(false);
    }
  }

  async function resync() {
    try {
      const res = await fetch("/api/state", { cache: "no-store" }).then((r) => r.json());
      setBattle(res.battle?.state ?? null);
      await ctx.refresh();
    } catch { /* sem rede: mantém a tela */ }
  }

  async function refill() {
    if (!confirm(t("Gastar 💎 {g} para ganhar +{n} caçadas hoje?", { g: HUNT_REFILL.gems, n: HUNT_REFILL.hunts }))) return;
    setBusy(true);
    try {
      await post("/api/battle/refill");
      play("coin");
      ctx.toast(t("+{n} caçadas liberadas para hoje!", { n: HUNT_REFILL.hunts }), "reward");
      await ctx.refresh();
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function flee() {
    setBusy(true);
    try {
      await post("/api/battle/flee");
      setBattle(null);
      ctx.toast(t("Você fugiu da batalha."));
      await ctx.refresh();
    } catch (e) {
      ctx.toast((e as Error).message, "error");
      await resync();
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const r = result.state.rewards;
    return (
      <Panel className="mx-auto max-w-md p-8 text-center">
        <motion.h2 initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}
          className={`font-display text-4xl font-black ${result.outcome === "won" ? "text-gold" : "text-red-400"}`}>
          {result.outcome === "won" ? t("VITÓRIA!") : t("DERROTA")}
        </motion.h2>
        {r ? (
          <div className="mt-6 space-y-2">
            <p>✨ +{r.xp} XP</p>
            <p>🪙 +{r.gold} {t("ouro")}</p>
            {r.item && <p className="text-amber-300">{t("🎁 Item encontrado!")}</p>}
            {result.state.storyResult && (
              <div className="mt-3 rounded-lg bg-gold/10 p-3">
                <p className="font-display text-gold">{t("📖 Capítulo {n} concluído!", { n: result.state.story ?? 0 })}</p>
                <p>✨ {result.state.storyResult.xp} XP · 🪙 {result.state.storyResult.gold}{result.state.storyResult.gems ? ` · 💎 ${result.state.storyResult.gems}` : ""}</p>
                {result.state.storyResult.item && <p className="text-amber-300">✨ {t(ITEM_BY_ID[result.state.storyResult.item]?.name ?? "")}</p>}
                <p className="mt-1 text-xs text-white/60">{t("Veja a continuação na aba 🗺️ Mundo.")}</p>
              </div>
            )}
            {result.state.dungeon?.chest && (
              <div className="mt-3 rounded-lg bg-gold/10 p-3">
                <p className="font-display text-gold">{t("🎁 Baú de {nome}", { nome: t(result.state.dungeon.name) })}</p>
                <p>🪙 {result.state.dungeon.chest.gold}{result.state.dungeon.chest.gems ? ` · 💎 ${result.state.dungeon.chest.gems}` : ""}</p>
                {result.state.dungeon.chest.item && <p className="text-amber-300">✨ {t(ITEM_BY_ID[result.state.dungeon.chest.item]?.name ?? "")}!</p>}
              </div>
            )}
            {r.levelUps > 0 && <p className="font-display text-xl text-arcane">{t("⭐ Subiu de nível!")}</p>}
          </div>
        ) : (
          <p className="mt-4 text-white/60">{t("Recupere sua vida e tente novamente.")}</p>
        )}
        <button className="btn-gold mt-8 w-full" onClick={() => { setResult(null); setBattle(null); }}>{t("Continuar")}</button>
      </Panel>
    );
  }

  if (battle) {
    const pot = state.inventory.find((i) => i.itemId === "pocao_vida")?.qty ?? 0;
    const last = battle.log.slice(-8).reverse();
    const fx = battle.effects ?? {};
    const lo = state.character.loadout;
    return (
      <div className="space-y-3 pb-40 sm:space-y-4 sm:pb-0">
        {battle.dungeon && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-black/30 px-3 py-2 text-sm sm:px-4">
            <span className="font-display text-gold">🗝️ {battle.dungeon.name}</span>
            <span className="flex gap-1">{Array.from({ length: battle.dungeon.total }, (_, i) => (
              <span key={i} className={`h-2 w-8 rounded-full ${i < battle.dungeon!.stage ? "bg-emerald-500" : i === battle.dungeon!.stage ? "bg-gold animate-pulse" : "bg-white/10"}`} />
            ))}</span>
            <span className="text-white/50">{t("Estágio {a}/{b}", { a: battle.dungeon.stage + 1, b: battle.dungeon.total })}{battle.dungeon.stage === battle.dungeon.total - 1 ? ` · ${t("Guardião!")}` : ""}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:gap-6">
          <Fighter refEl={playerRef} name={state.character.name} image={state.character.portrait} hp={battle.player.hp} max={battle.player.maxHp} floats={floats.filter((f) => f.side === "player")}
            badges={[fx.pPoison ? `☠️ ${t("Veneno")} ${fx.pPoison}` : "", fx.pStun ? `💫 ${t("Atordoado")}` : "", fx.pStone ? `🪨 ${t("Pele de Pedra")} ${fx.pStone}` : ""]} />
          <Fighter refEl={enemyRef} name={t(battle.enemy.name)} image={ENEMY_BY_ID[battle.enemyId]?.image ?? battle.enemy.image} hp={battle.enemy.hp} max={battle.enemy.maxHp} boss={battle.enemy.boss} floats={floats.filter((f) => f.side === "enemy")}
            badges={[fx.ePoison ? `☠️ ${t("Veneno")} ${fx.ePoison}` : "", fx.eStun ? `💫 ${t("Atordoado")}` : ""]} />
        </div>
        {/* Celular: ações fixas no rodapé, sempre ao alcance do polegar. */}
        <div className="fixed inset-x-0 bottom-0 z-40 space-y-1.5 rounded-t-2xl border-t border-white/10 bg-ink/95 p-2 shadow-[0_-8px_24px_#0008] backdrop-blur sm:static sm:z-auto sm:rounded-xl sm:border sm:bg-panel/60 sm:p-4 sm:shadow-none"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
          {lo.eq.length > 0 && (
            <div className={`grid gap-1.5 sm:gap-2 ${lo.eq.length === 1 ? "grid-cols-1" : lo.eq.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
              {lo.eq.map((id, i) => {
                const sk = SKILL_BY_ID[id];
                if (!sk) return null;
                const cd = battle.cds?.[id] ?? 0;
                const lv = lo.lv[id] ?? 1;
                return (
                  <motion.button key={id} whileTap={{ scale: 0.94 }} onClick={() => act(`s${i}` as PlayerAction)} disabled={busy || cd > 0} title={t(sk.description)}
                    className="flex min-h-11 min-w-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-arcane/80 to-fuchsia-700/70 px-2 py-1.5 text-left font-display text-xs transition hover:brightness-110 disabled:opacity-40 sm:gap-2 sm:px-3 sm:text-sm">
                    <Image src={sk.icon} alt="" width={28} height={28} className="shrink-0 rounded" />
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate">{t(sk.name)}</span>
                      <span className="block text-[10px] font-sans text-white/70">{cd > 0 ? t("Recarga ({n})", { n: cd }) : `${t("Nv.")} ${lv} · ⏳${skillPower(sk, lv).cooldown}`}</span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            <ActBtn disabled={busy} onClick={() => act("attack")} label={t("⚔️ Atacar")} />
            <ActBtn disabled={busy} onClick={() => act("defend")} label={t("🛡️ Defender")} />
            <ActBtn disabled={busy || !pot} onClick={() => act("potion")} label={t("🧪 Poção ({n})", { n: pot })} />
            <ActBtn disabled={busy} onClick={flee} label={t("🏃 Fugir")} muted />
          </div>
          {fx.pStun ? <p className="text-center text-[11px] text-sky-300">{t("💫 Você está atordoado: a próxima ação será perdida (a poção não é gasta).")}</p> : null}
        </div>
        <Panel className="p-3 text-sm sm:p-4">
          <p className="mb-2 font-display text-gold">{t("Turno {n}", { n: battle.turn })}</p>
          <ul className="max-h-36 space-y-1 overflow-y-auto pr-1 text-white/70 sm:max-h-none" aria-live="polite">
            {last.map((l, i) => (
              <li key={`${l.turn}-${i}`}>{describe(t, l, state.character.name, t(battle.enemy.name))}</li>
            ))}
          </ul>
        </Panel>
      </div>
    );
  }

  const huntsOut = state.daily.hunts >= state.daily.huntLimit;
  const refillLeft = state.daily.huntRefills < HUNT_REFILL.perDay;
  const tabs = (
    <div className="mb-4 flex gap-2">
      {([["hunt", "⚔️ Caçada"], ["dungeon", "🗝️ Masmorras"]] as const).map(([k, l]) => (
        <button key={k} onClick={() => setMode(k)} className={`rounded-lg px-4 py-2 text-sm font-display ${mode === k ? "bg-gold text-ink" : "bg-white/5 text-white/70"}`}>{t(l)}</button>
      ))}
    </div>
  );
  if (mode === "dungeon") {
    return <div>{tabs}<Dungeons ctx={ctx} onEnter={async () => { const r = await fetch("/api/state", { cache: "no-store" }).then((x) => x.json()); setBattle(r.battle?.state ?? null); }} /></div>;
  }

  return (
    <div>
      {tabs}
      <p className="mb-4 text-sm text-white/60">{t("Cada caçada custa ⚡ {e} de energia. Sua vida atual: {hp}/{max}", { e: PVE_ENERGY_COST, hp: state.character.hp, max: state.character.maxHp })}
        {" · "}<span className={huntsOut ? "text-amber-300" : ""}>{t("Caçadas hoje: {a}/{b}", { a: state.daily.hunts, b: state.daily.huntLimit })}</span></p>
      {huntsOut && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-sky-500/10 px-4 py-3 text-sm ring-1 ring-sky-400/30">
          <span className="flex-1">{refillLeft
            ? t("Acabaram as caçadas de hoje. Renove agora: +{n} caçadas por 💎 {g} (1 vez por dia).", { n: HUNT_REFILL.hunts, g: HUNT_REFILL.gems })
            : t("Você já renovou as caçadas hoje. Volte amanhã!")}</span>
          {refillLeft && (
            <button className="btn-gold min-h-11 px-4" disabled={busy || state.wallet.gems < HUNT_REFILL.gems} onClick={refill}>
              {state.wallet.gems < HUNT_REFILL.gems ? t("Gemas insuficientes") : t("Renovar · 💎 {g}", { g: HUNT_REFILL.gems })}
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {ENEMIES.filter((e) => !e.story).map((e, i) => {
          const region = REGION_OF_ENEMY[e.id];
          const regionLocked = !regionUnlocked(region, state.character.storyChapter);
          const locked = state.character.level < e.minLevel || regionLocked;
          return (
            <motion.button key={e.id} disabled={busy || locked || !!state.quest} onClick={() => start(e.id)}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`panel group flex flex-col justify-start overflow-hidden text-left transition hover:-translate-y-1 disabled:cursor-not-allowed ${locked ? "opacity-50 grayscale" : ""} ${e.boss ? "ring-2 ring-ember/70" : ""}`}>
              <div className="relative aspect-[3/4] w-full shrink-0">
                <Image src={e.image} alt="" fill sizes="300px" className="object-cover transition duration-500 group-hover:scale-105" />
                {e.boss && <span className="absolute right-2 top-2 rounded bg-ember px-2 py-0.5 text-xs font-bold">{t("CHEFE")}</span>}
              </div>
              <div className="p-3">
                <p className="font-display text-sm">{t(e.name)}</p>
                <p className="text-xs text-white/50">{regionLocked ? `🔒 ${t(region!.name)} · ${t("Capítulo {n}", { n: region!.unlockChapter })}` : locked ? t("Requer nível {n}", { n: e.minLevel }) : `❤️ ${e.maxHp} · ✨ ${xpRate(e.xp)} XP · 🪙 ${e.gold}`}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
      {state.quest && <p className="mt-4 text-center text-sm text-amber-300">{t("Você está em uma missão. Termine-a para caçar.")}</p>}
    </div>
  );
}

function Fighter(props: { refEl: React.Ref<HTMLDivElement>; name: string; image: string; hp: number; max: number; boss?: boolean; floats: Float[]; badges?: string[] }) {
  const t = useT();
  return (
    <div ref={props.refEl} className={`panel relative overflow-hidden p-2 sm:p-3 ${props.boss ? "ring-2 ring-ember/70" : ""}`}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg sm:aspect-square">
        <Image src={props.image} alt="" fill sizes="(max-width: 640px) 50vw, 400px" className={`object-cover ${props.hp <= 0 ? "grayscale" : ""}`} />
        <div className="absolute left-1 top-1 flex flex-col gap-1 sm:left-2 sm:top-2">
          {props.badges?.filter(Boolean).map((b) => <span key={b} className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] sm:px-2 sm:text-[11px]">{b}</span>)}
        </div>
        <AnimatePresence>
          {props.floats.map((f) => (
            <motion.span key={f.id} initial={{ y: 0, opacity: 1, scale: 0.6 }} animate={{ y: -60, opacity: 0, scale: 1.2 }} exit={{ opacity: 0 }} transition={{ duration: 1.1 }}
              className={`pointer-events-none absolute inset-x-0 top-1/2 text-center font-display text-2xl font-black drop-shadow-[0_2px_4px_#000] ${f.color}`}>
              {f.text}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <p className="mt-1.5 truncate font-display text-xs sm:mt-2 sm:text-sm">{props.name}</p>
      <Bar value={props.hp} max={props.max} color="bg-life" label={t("Vida")} />
    </div>
  );
}

function ActBtn({ label, onClick, disabled, accent, muted }: { label: string; onClick: () => void; disabled?: boolean; accent?: boolean; muted?: boolean }) {
  return (
    <motion.button whileTap={{ scale: 0.94 }} onClick={onClick} disabled={disabled}
      className={`min-h-11 rounded-lg px-1 py-2 font-display text-[11px] leading-tight transition disabled:opacity-40 sm:px-3 sm:py-3 sm:text-sm ${accent ? "bg-arcane/70 hover:bg-arcane" : muted ? "bg-white/5 hover:bg-white/10" : "bg-gold/90 text-ink hover:bg-gold"}`}>
      {label}
    </motion.button>
  );
}

function describe(t: TFn, l: LogEntry, me: string, foe: string) {
  const who = l.actor === "player" ? me : foe;
  const other = l.actor === "player" ? foe : me;
  const target = l.target === "player" ? me : foe;
  if (l.action === "stunned") return t("💫 {a} está atordoado e perde o turno.", { a: target });
  if (l.action === "poison") return t("☠️ O veneno causa {d} de dano em {a}.", { d: l.dmg ?? 0, a: target });
  const sk = l.skillId ? SKILL_BY_ID[l.skillId] : undefined;
  if (sk && !l.dmg && !l.miss) {
    const parts = [l.heal ? t("recupera {h} de vida", { h: l.heal }) : "", l.effect === "stun" ? t("atordoa {b}", { b: other }) : "", l.effect === "stone" ? t("reduz o dano recebido") : ""].filter(Boolean).join(" · ");
    return `✨ ${who}: ${t(sk.name)}${parts ? ` — ${parts}` : ""}.`;
  }
  if (l.action === "racial" && l.effect === "stone") return t("🪨 {a} ativa Pele de Pedra e recupera {h} de vida.", { a: who, h: l.heal ?? 0 });
  if (l.action === "defend") return t("🛡️ {a} se defende e recupera {h} de vida.", { a: who, h: l.heal ?? 0 });
  if (l.action === "potion") return t("🧪 {a} bebe uma poção (+{h}).", { a: who, h: l.heal ?? 0 });
  if (l.miss) return t("💨 {b} esquiva do ataque de {a}.", { a: who, b: other });
  const icon = l.action === "racial" ? "🔥" : l.action === "skill" ? "✨" : "⚔️";
  const base = l.crit ? t("{a} causa {d} de dano CRÍTICO em {b}", { a: who, d: l.dmg ?? 0, b: other }) : t("{a} causa {d} de dano em {b}", { a: who, d: l.dmg ?? 0, b: other });
  const extra = l.effect === "poison" ? t(" e o envenena") : l.effect === "stun" ? t(" e o atordoa") : l.effect === "rage" ? t(" em fúria") : "";
  const name = sk ? ` [${t(sk.name)}]` : "";
  const heal = sk && l.heal ? ` (+${l.heal} ❤️)` : "";
  return `${icon}${name} ${base}${extra}${heal}.`;
}
