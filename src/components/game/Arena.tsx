"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import { DUEL_REFILL, PVP_ENERGY_COST } from "@/lib/game/rules";
import { post } from "./api";
import { play } from "./sfx";
import { Bar, Panel } from "./ui";
import Avatar from "./Avatar";
import { useT } from "@/lib/i18n/client";

type Opp = { name: string; level: number; rating: number; wins: number; losses: number; raceName: string; portrait: string; frame: string | null; title: string | null };
type Fight = {
  won: boolean; delta: number; rewards: { xp: number; gold: number; levelUps: number };
  me: { name: string; maxHp: number; hp: number }; them: { name: string; maxHp: number; hp: number };
  log: { turn: number; side: "a" | "b"; dmg?: number; crit?: boolean; miss?: boolean; action: string }[];
};

export default function Arena({ ctx }: { ctx: GameCtx }) {
  const t = useT();
  const [opps, setOpps] = useState<Opp[] | null>(null);
  const [fight, setFight] = useState<(Fight & { opp: Opp }) | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/pvp/opponents", { cache: "no-store" }).then((r) => r.json()).then((d) => setOpps(d.opponents ?? []));
  }, []);

  // Replay animado da luta (calculada inteiramente no servidor).
  useEffect(() => {
    if (!fight) return;
    if (step >= fight.log.length) { if (step > 0) play(fight.won ? "victory" : "defeat"); return; }
    const t = setTimeout(() => {
      const l = fight.log[step];
      play(l.miss ? "miss" : l.side === "a" ? (l.crit ? "crit" : l.action === "skill" ? "skill" : "hit") : "hurt");
      setStep((s) => s + 1);
    }, 380);
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

  async function refill() {
    if (!confirm(t("Gastar 💎 {g} para ganhar +{n} duelos hoje?", { g: DUEL_REFILL.gems, n: DUEL_REFILL.duels }))) return;
    setBusy(true);
    try {
      await post("/api/pvp/refill");
      play("coin");
      ctx.toast(t("+{n} duelos liberados para hoje!", { n: DUEL_REFILL.duels }), "reward");
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
          <span className="font-display text-3xl text-gold">{t("VS")}</span>
          <Side name={fight.them.name} image={fight.opp.portrait} hp={Math.max(0, hpB)} max={fight.them.maxHp} hit={cur?.side === "a" && !cur.miss} />
        </div>
        {done && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 text-center">
            <p className={`font-display text-4xl font-black ${fight.won ? "text-gold" : "text-red-400"}`}>{fight.won ? t("VITÓRIA!") : t("DERROTA")}</p>
            <p className="mt-2 text-sm">{t("Rating")} {fight.won ? "+" : "−"}{fight.delta} · ✨ +{fight.rewards.xp} XP{fight.rewards.gold ? ` · 🪙 +${fight.rewards.gold}` : ""}</p>
            <button className="btn-gold mt-6" onClick={() => setFight(null)}>{t("Voltar à Arena")}</button>
          </motion.div>
        )}
      </Panel>
    );
  }

  const { daily, wallet, character } = ctx.state;
  const duelsOut = daily.duels >= daily.duelLimit;
  const refillLeft = daily.duelRefills < DUEL_REFILL.perDay;
  return (
    <div>
      <p className="mb-4 text-sm text-white/60">
        {t("Desafie heróis de nível próximo. Cada luta custa ⚡ {e}. Seu rating:", { e: PVP_ENERGY_COST })} <b className="text-gold">{character.pvpRating}</b>
        {" · "}<span className={duelsOut ? "text-amber-300" : ""}>{t("Duelos hoje: {a}/{b}", { a: daily.duels, b: daily.duelLimit })}</span>
      </p>
      {duelsOut && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-sky-500/10 px-4 py-3 text-sm ring-1 ring-sky-400/30">
          <span className="flex-1">{refillLeft
            ? t("Acabaram os duelos de hoje. Renove agora: +{n} duelos por 💎 {g} (1 vez por dia).", { n: DUEL_REFILL.duels, g: DUEL_REFILL.gems })
            : t("Você já renovou os duelos hoje. Volte amanhã!")}</span>
          {refillLeft && (
            <button className="btn-gold min-h-11 px-4" disabled={busy || wallet.gems < DUEL_REFILL.gems} onClick={refill}>
              {wallet.gems < DUEL_REFILL.gems ? t("Gemas insuficientes") : t("Renovar · 💎 {g}", { g: DUEL_REFILL.gems })}
            </button>
          )}
        </div>
      )}
      {!opps ? (
        <p className="text-white/50">{t("Procurando adversários…")}</p>
      ) : opps.length === 0 ? (
        <Panel className="p-8 text-center text-white/60">{t("Nenhum adversário do seu nível ainda. Volte mais tarde!")}</Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {opps.map((o, i) => (
            <motion.div key={o.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="panel flex items-center gap-3 p-3">
              <Avatar src={o.portrait} frame={o.frame} size={56} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display">{o.name}{o.title && <span className="ml-1 text-xs text-amber-200/80">« {t(o.title)} »</span>}</p>
                <p className="text-xs text-white/50">{t("Nv.")} {o.level} · {t(o.raceName)} · ⭐ {o.rating} · {t("{w}V/{l}D", { w: o.wins, l: o.losses })}</p>
              </div>
              <button className="btn-gold !px-4 !py-2 text-sm" disabled={busy || duelsOut || character.energy < PVP_ENERGY_COST} onClick={() => challenge(o)}>{t("Desafiar")}</button>
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
