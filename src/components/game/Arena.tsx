"use client";

import { PET_BY_ID } from "@/lib/game/pets";
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
  me: { name: string; maxHp: number; hp: number; pet?: PetRef | null }; them: { name: string; maxHp: number; hp: number; pet?: PetRef | null };
  log: { turn: number; side: "a" | "b"; dmg?: number; heal?: number; crit?: boolean; miss?: boolean; action: string; petId?: string; effect?: string }[];
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
      play(l.action === "pet" && !l.dmg ? "heal" : l.miss ? "miss" : l.side === "a" ? (l.crit ? "crit" : l.action === "skill" ? "skill" : "hit") : "hurt");
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
    // Vida de cada lado refeita passo a passo: dano do adversário (golpe ou pet) e cura do próprio pet.
    let hpA = fight.me.maxHp, hpB = fight.them.maxHp;
    for (const l of shown) {
      if (l.side === "a") { hpB = Math.max(0, hpB - (l.dmg ?? 0)); hpA = Math.min(fight.me.maxHp, hpA + (l.heal ?? 0)); }
      else { hpA = Math.max(0, hpA - (l.dmg ?? 0)); hpB = Math.min(fight.them.maxHp, hpB + (l.heal ?? 0)); }
    }
    const done = step >= fight.log.length;
    const cur = shown.at(-1);
    return (
      <Panel className="mx-auto max-w-3xl p-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <Side name={fight.me.name} image={ctx.state.character.portrait} hp={Math.max(0, hpA)} max={fight.me.maxHp} hit={cur?.side === "b" && !cur.miss && !!cur.dmg} pet={fight.me.pet} petActed={cur?.action === "pet" && cur.side === "a"} />
          <span className="font-display text-3xl text-gold">{t("VS")}</span>
          <Side name={fight.them.name} image={fight.opp.portrait} hp={Math.max(0, hpB)} max={fight.them.maxHp} hit={cur?.side === "a" && !cur.miss && !!cur.dmg} pet={fight.them.pet} petActed={cur?.action === "pet" && cur.side === "b"} />
        </div>
        {/* Log do duelo: últimas ações (as do pet em destaque). */}
        <ul className="mt-4 h-24 space-y-0.5 overflow-hidden text-center text-xs text-white/60" aria-live="polite">
          {shown.slice(-5).reverse().map((l, i) => {
            const [who, other] = l.side === "a" ? [fight.me.name, fight.them.name] : [fight.them.name, fight.me.name];
            const pet = l.action === "pet";
            const text = pet
              ? `🐾 ${t("{p} de {a}", { p: t(PET_BY_ID[l.petId ?? ""]?.name ?? "Pet"), a: who })}: ${[
                  l.dmg ? t("causa {d} de dano em {b}", { d: l.dmg, b: other }) : "",
                  l.effect === "weak" ? t("enfraquece o próximo ataque de {b}", { b: other }) : "",
                  l.heal ? t("cura {h} de vida de {a}", { h: l.heal, a: who }) : "",
                ].filter(Boolean).join(` ${t("e")} `)}.`
              : l.miss ? t("💨 {b} esquiva do ataque de {a}.", { a: who, b: other })
              : `${l.action === "skill" ? "✨" : "⚔️"} ${l.crit ? t("{a} causa {d} de dano CRÍTICO em {b}", { a: who, d: l.dmg ?? 0, b: other }) : t("{a} causa {d} de dano em {b}", { a: who, d: l.dmg ?? 0, b: other })}.`;
            return <li key={shown.length - i} className={`${i === 0 ? "text-sm text-white/90" : ""} ${pet ? "text-orange-200" : ""}`}>{text}</li>;
          })}
        </ul>
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

type PetRef = { id: string; level: number };

function Side({ name, image, hp, max, hit, pet, petActed }: { name: string; image: string; hp: number; max: number; hit?: boolean; pet?: PetRef | null; petActed?: boolean }) {
  const t = useT();
  const def = pet ? PET_BY_ID[pet.id] : undefined;
  return (
    <div className="text-center">
      <motion.div animate={hit ? { x: [0, -8, 8, 0] } : {}} transition={{ duration: 0.3 }} className="relative mx-auto aspect-square w-full max-w-48 overflow-hidden rounded-xl ring-2 ring-gold/40">
        <Image src={image} alt="" fill sizes="200px" className={`object-cover ${hp <= 0 ? "grayscale" : ""}`} />
        {def && (
          <motion.div animate={petActed ? { y: [0, -10, 0], scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.35 }} title={t(def.name)}
            className={`absolute bottom-1 right-1 h-10 w-10 overflow-hidden rounded-full bg-black/60 ring-2 sm:h-14 sm:w-14 ${petActed ? "ring-orange-300 shadow-[0_0_14px_#fdba74]" : "ring-gold/60"}`}>
            <Image src={def.image} alt={t(def.name)} fill sizes="56px" className="object-cover" />
          </motion.div>
        )}
      </motion.div>
      <p className="mt-2 truncate font-display">{name}</p>
      {def && pet && <p className="truncate text-[11px] text-orange-200/90">🐾 {t(def.name)} · {t("Nv.")} {pet.level}</p>}
      <Bar value={hp} max={max} color="bg-life" />
    </div>
  );
}
