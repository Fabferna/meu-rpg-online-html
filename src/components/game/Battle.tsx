"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import type { GameCtx } from "./GameApp";
import type { BattleState, LogEntry, PlayerAction } from "@/lib/game/combat";
import { ENEMIES } from "@/lib/game/enemies";
import { PVE_ENERGY_COST } from "@/lib/game/rules";
import { post } from "./api";
import { play } from "./sfx";
import { Bar, Panel } from "./ui";

type Result = { outcome: "won" | "lost"; state: BattleState };
type Float = { id: number; side: "player" | "enemy"; text: string; color: string };

export default function Battle({ ctx }: { ctx: GameCtx }) {
  const { state } = ctx;
  const [battle, setBattle] = useState<BattleState | null>(state.battle?.state ?? null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [floats, setFloats] = useState<Float[]>([]);
  const [enemyRef, animateEnemy] = useAnimate();
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
      const target = l.action === "defend" || l.action === "potion" ? l.actor : l.actor === "player" ? "enemy" : "player";
      const text = l.miss ? "Esquivou!" : l.heal ? `+${l.heal}` : `${l.crit ? "CRÍTICO " : ""}-${l.dmg}`;
      const color = l.heal ? "text-emerald-300" : l.crit ? "text-amber-300 text-3xl" : l.miss ? "text-white/70" : "text-red-400";
      return { id: Date.now() + i, side: target, text, color };
    });
    setFloats((f) => [...f, ...fl]);
    setTimeout(() => setFloats((f) => f.filter((x) => !fl.includes(x))), 1200);
    entries.forEach((l, i) => setTimeout(() => {
      if (l.action === "defend") play("defend");
      else if (l.action === "potion") play("heal");
      else if (l.miss) play("miss");
      else if (l.actor === "player") play(l.action === "skill" ? "skill" : l.crit ? "crit" : "hit");
      else play(l.crit ? "crit" : "hurt");
    }, i * 260));
    for (const l of entries) {
      if (l.dmg && !l.miss) {
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
      const res = await post<{ outcome: "won" | "lost" | "active"; state: BattleState }>("/api/battle/action", { action });
      showFloats(res.state.log.filter((l) => l.turn === res.state.turn));
      setBattle(res.state);
      if (res.outcome !== "active") {
        setTimeout(() => {
          setResult({ outcome: res.outcome as "won" | "lost", state: res.state });
          play(res.outcome === "won" ? "victory" : "defeat");
          if (res.state.rewards?.levelUps) setTimeout(() => play("levelup"), 900);
        }, 600);
        await ctx.refresh();
      } else if (action === "potion") {
        await ctx.refresh();
      }
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
      ctx.toast("Você fugiu da batalha.");
      await ctx.refresh();
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
          {result.outcome === "won" ? "VITÓRIA!" : "DERROTA"}
        </motion.h2>
        {r ? (
          <div className="mt-6 space-y-2">
            <p>✨ +{r.xp} XP</p>
            <p>🪙 +{r.gold} ouro</p>
            {r.item && <p className="text-amber-300">🎁 Item encontrado!</p>}
            {r.levelUps > 0 && <p className="font-display text-xl text-arcane">⭐ Subiu de nível!</p>}
          </div>
        ) : (
          <p className="mt-4 text-white/60">Recupere sua vida e tente novamente.</p>
        )}
        <button className="btn-gold mt-8 w-full" onClick={() => { setResult(null); setBattle(null); }}>Continuar</button>
      </Panel>
    );
  }

  if (battle) {
    const pot = state.inventory.find((i) => i.itemId === "pocao_vida")?.qty ?? 0;
    const last = battle.log.slice(-6).reverse();
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-6">
          <Fighter refEl={playerRef} name={state.character.name} image={state.character.portrait} hp={battle.player.hp} max={battle.player.maxHp} floats={floats.filter((f) => f.side === "player")} />
          <Fighter refEl={enemyRef} name={battle.enemy.name} image={battle.enemy.image} hp={battle.enemy.hp} max={battle.enemy.maxHp} boss={battle.enemy.boss} floats={floats.filter((f) => f.side === "enemy")} />
        </div>
        <Panel className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-5">
          <ActBtn disabled={busy} onClick={() => act("attack")} label="⚔️ Atacar" />
          <ActBtn disabled={busy || battle.skillCooldown > 0} onClick={() => act("skill")} label={battle.skillCooldown > 0 ? `✨ Recarga (${battle.skillCooldown})` : "✨ Habilidade"} accent />
          <ActBtn disabled={busy} onClick={() => act("defend")} label="🛡️ Defender" />
          <ActBtn disabled={busy || !pot} onClick={() => act("potion")} label={`🧪 Poção (${pot})`} />
          <ActBtn disabled={busy} onClick={flee} label="🏃 Fugir" muted />
        </Panel>
        <Panel className="p-4 text-sm">
          <p className="mb-2 font-display text-gold">Turno {battle.turn}</p>
          <ul className="space-y-1 text-white/70">
            {last.map((l, i) => (
              <li key={`${l.turn}-${i}`}>{describe(l, state.character.name, battle.enemy.name)}</li>
            ))}
          </ul>
        </Panel>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-white/60">Cada caçada custa ⚡ {PVE_ENERGY_COST} de energia. Sua vida atual: {state.character.hp}/{state.character.maxHp}</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {ENEMIES.map((e, i) => {
          const locked = state.character.level < e.minLevel;
          return (
            <motion.button key={e.id} disabled={busy || locked || !!state.quest} onClick={() => start(e.id)}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`panel group overflow-hidden text-left transition hover:-translate-y-1 disabled:cursor-not-allowed ${locked ? "opacity-50 grayscale" : ""} ${e.boss ? "ring-2 ring-ember/70" : ""}`}>
              <div className="relative aspect-[3/4]">
                <Image src={e.image} alt="" fill sizes="300px" className="object-cover transition duration-500 group-hover:scale-105" />
                {e.boss && <span className="absolute right-2 top-2 rounded bg-ember px-2 py-0.5 text-xs font-bold">CHEFE</span>}
              </div>
              <div className="p-3">
                <p className="font-display text-sm">{e.name}</p>
                <p className="text-xs text-white/50">{locked ? `Requer nível ${e.minLevel}` : `❤️ ${e.maxHp} · ✨ ${e.xp} XP · 🪙 ${e.gold}`}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
      {state.quest && <p className="mt-4 text-center text-sm text-amber-300">Você está em uma missão. Termine-a para caçar.</p>}
    </div>
  );
}

function Fighter(props: { refEl: React.Ref<HTMLDivElement>; name: string; image: string; hp: number; max: number; boss?: boolean; floats: Float[] }) {
  return (
    <div ref={props.refEl} className={`panel relative overflow-hidden p-3 ${props.boss ? "ring-2 ring-ember/70" : ""}`}>
      <div className="relative aspect-square overflow-hidden rounded-lg">
        <Image src={props.image} alt="" fill sizes="400px" className={`object-cover ${props.hp <= 0 ? "grayscale" : ""}`} />
        <AnimatePresence>
          {props.floats.map((f) => (
            <motion.span key={f.id} initial={{ y: 0, opacity: 1, scale: 0.6 }} animate={{ y: -60, opacity: 0, scale: 1.2 }} exit={{ opacity: 0 }} transition={{ duration: 1.1 }}
              className={`pointer-events-none absolute inset-x-0 top-1/2 text-center font-display text-2xl font-black drop-shadow-[0_2px_4px_#000] ${f.color}`}>
              {f.text}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <p className="mt-2 truncate font-display text-sm">{props.name}</p>
      <Bar value={props.hp} max={props.max} color="bg-life" label="Vida" />
    </div>
  );
}

function ActBtn({ label, onClick, disabled, accent, muted }: { label: string; onClick: () => void; disabled?: boolean; accent?: boolean; muted?: boolean }) {
  return (
    <motion.button whileTap={{ scale: 0.94 }} onClick={onClick} disabled={disabled}
      className={`rounded-lg px-3 py-3 font-display text-sm transition disabled:opacity-40 ${accent ? "bg-arcane/70 hover:bg-arcane" : muted ? "bg-white/5 hover:bg-white/10" : "bg-gold/90 text-ink hover:bg-gold"}`}>
      {label}
    </motion.button>
  );
}

function describe(l: LogEntry, me: string, foe: string) {
  const who = l.actor === "player" ? me : foe;
  const other = l.actor === "player" ? foe : me;
  if (l.action === "defend") return `🛡️ ${who} se defende e recupera ${l.heal} de vida.`;
  if (l.action === "potion") return `🧪 ${who} bebe uma poção (+${l.heal}).`;
  if (l.miss) return `💨 ${other} esquiva do ataque de ${who}.`;
  return `${l.action === "skill" ? "✨" : "⚔️"} ${who} causa ${l.dmg} de dano${l.crit ? " CRÍTICO" : ""} em ${other}.`;
}
