"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import { PVP_ENERGY_COST } from "@/lib/game/rules";
import { post } from "./api";
import { Bar, Panel } from "./ui";

type Opp = { name: string; level: number; rating: number; wins: number; losses: number; raceName: string; portrait: string };
type Fight = {
  won: boolean; delta: number; rewards: { xp: number; gold: number; levelUps: number };
  me: { name: string; maxHp: number; hp: number }; them: { name: string; maxHp: number; hp: number };
  log: { turn: number; side: "a" | "b"; dmg?: number; crit?: boolean; miss?: boolean; action: string }[];
};

export default function Arena({ ctx }: { ctx: GameCtx }) {
  const [opps, setOpps] = useState<Opp[] | null>(null);
  const [fight, setFight] = useState<(Fight & { opp: Opp }) | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/pvp/opponents", { cache: "no-store" }).then((r) => r.json()).then((d) => setOpps(d.opponents ?? []));
  }, []);

  // Replay animado da luta (calculada inteiramente no servidor).
  useEffect(() => {
    if (!fight || step >= fight.log.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), 380);
    return () => clearTimeout(t);
  }, [fight, step]);

  async function challenge(o: Opp) {
    setBusy(true);
    try {
      const res = await post<Fight>("/api/pvp/fight", { opponent: o.name });
      setFight({ ...res, opp: o });
      setStep(0);
      await ctx.refresh();
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (fight) {
    const shown = fight.log.slice(0, step);
    const hpA = fight.me.maxHp - shown.filter((l) => l.side === "b").reduce((a, l) => a + (l.dmg ?? 0), 0);
    const hpB = fight.them.maxHp - shown.filter((l) => l.side === "a").reduce((a, l) => a + (l.dmg ?? 0), 0);
    const done = step >= fight.log.length;
    const cur = shown.at(-1);
    return (
      <Panel className="mx-auto max-w-3xl p-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <Side name={fight.me.name} image={ctx.state.character.portrait} hp={Math.max(0, hpA)} max={fight.me.maxHp} hit={cur?.side === "b" && !cur.miss} />
          <span className="font-display text-3xl text-gold">VS</span>
          <Side name={fight.them.name} image={fight.opp.portrait} hp={Math.max(0, hpB)} max={fight.them.maxHp} hit={cur?.side === "a" && !cur.miss} />
        </div>
        {done && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 text-center">
            <p className={`font-display text-4xl font-black ${fight.won ? "text-gold" : "text-red-400"}`}>{fight.won ? "VITÓRIA!" : "DERROTA"}</p>
            <p className="mt-2 text-sm">Rating {fight.won ? "+" : "−"}{fight.delta} · ✨ +{fight.rewards.xp} XP{fight.rewards.gold ? ` · 🪙 +${fight.rewards.gold}` : ""}</p>
            <button className="btn-gold mt-6" onClick={() => setFight(null)}>Voltar à Arena</button>
          </motion.div>
        )}
      </Panel>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-white/60">
        Desafie heróis de nível próximo. Cada luta custa ⚡ {PVP_ENERGY_COST}. Seu rating: <b className="text-gold">{ctx.state.character.pvpRating}</b>
      </p>
      {!opps ? (
        <p className="text-white/50">Procurando adversários…</p>
      ) : opps.length === 0 ? (
        <Panel className="p-8 text-center text-white/60">Nenhum adversário do seu nível ainda. Volte mais tarde!</Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {opps.map((o, i) => (
            <motion.div key={o.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="panel flex items-center gap-3 p-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-white/20">
                <Image src={o.portrait} alt="" fill sizes="56px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display">{o.name}</p>
                <p className="text-xs text-white/50">Nv. {o.level} · {o.raceName} · ⭐ {o.rating} · {o.wins}V/{o.losses}D</p>
              </div>
              <button className="btn-gold !px-4 !py-2 text-sm" disabled={busy || ctx.state.character.energy < PVP_ENERGY_COST} onClick={() => challenge(o)}>Desafiar</button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Side({ name, image, hp, max, hit }: { name: string; image: string; hp: number; max: number; hit?: boolean }) {
  return (
    <div className="text-center">
      <motion.div animate={hit ? { x: [0, -8, 8, 0] } : {}} transition={{ duration: 0.3 }} className="relative mx-auto aspect-square w-full max-w-48 overflow-hidden rounded-xl ring-2 ring-gold/40">
        <Image src={image} alt="" fill sizes="200px" className={`object-cover ${hp <= 0 ? "grayscale" : ""}`} />
      </motion.div>
      <p className="mt-2 truncate font-display">{name}</p>
      <Bar value={hp} max={max} color="bg-life" />
    </div>
  );
}
