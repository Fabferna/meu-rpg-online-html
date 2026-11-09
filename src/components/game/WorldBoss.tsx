"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import { WORLD_BOSS_ITEMS, WORLD_BOSS_RULES, itemChance, worldBossReward } from "@/lib/game/worldBoss";
import { ITEM_BY_ID } from "@/lib/game/items";
import { fmtTime, post } from "./api";
import { Bar, Panel } from "./ui";
import { play } from "./sfx";
import { useT } from "@/lib/i18n/client";

type Data = {
  day: string; open: boolean; startsAt: string; endsAt: string; nextStartsAt: string;
  boss: { id: string; name: string; image: string; lore: string };
  hp: number; maxHp: number; defeated: boolean; participants: number;
  ranking: { pos: number; name: string; damage: number; me: boolean }[];
  myDamage: number; myAttacks: number; myPos: number; claimed: boolean; attacksLeft: number; canClaim: boolean;
};
type Hit = { dmg: number; crit: boolean; miss: boolean; skill: boolean };

/** Chefe do Mundo: todo dia às 21h (Brasília), todos juntos contra o mesmo chefe. */
export default function WorldBoss({ ctx }: { ctx: GameCtx }) {
  const t = useT();
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [shake, setShake] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const r = await fetch("/api/world-boss", { cache: "no-store" });
    if (r.ok) setD(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);
  // Relógio da contagem e atualização da vida compartilhada enquanto o evento está aberto.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => { if (d?.open && !d.defeated) load(); }, 5_000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [d?.open, d?.defeated, load]);
  // Abre/fecha sozinho na virada do horário.
  useEffect(() => {
    if (!d) return;
    const edge = d.open ? Date.parse(d.endsAt) : Date.parse(d.nextStartsAt);
    if (now >= edge) load();
  }, [now, d, load]);

  async function attack() {
    setBusy(true);
    try {
      const r = await post<{ dealt: number; defeated: boolean; hits: Hit[] }>("/api/world-boss/attack");
      setHits([]);
      r.hits.forEach((h, i) => setTimeout(() => {
        setHits((cur) => [...cur, h]); setShake((n) => n + 1);
        play(h.miss ? "miss" : h.crit ? "crit" : h.skill ? "skill" : "hit");
      }, i * 260));
      setTimeout(async () => {
        ctx.toast(r.defeated ? t("🌋 O CHEFE DO MUNDO CAIU! Resgate sua recompensa.") : t("Você causou {n} de dano!", { n: r.dealt.toLocaleString(t.locale) }), r.defeated ? "reward" : "ok");
        if (r.defeated) play("victory");
        await Promise.all([load(), ctx.refresh()]);
      }, r.hits.length * 260 + 300);
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setTimeout(() => setBusy(false), 1900);
    }
  }

  async function claim() {
    setBusy(true);
    try {
      const r = await post<{ gold: number; gems: number; item: string | null }>("/api/world-boss/claim");
      play(r.item ? "victory" : "coin");
      ctx.toast(r.item
        ? t("✨ ITEM EXCLUSIVO! {x} · +{g} 🪙{e}", { x: t(ITEM_BY_ID[r.item]?.name ?? ""), g: r.gold, e: r.gems ? ` · +${r.gems} 💎` : "" })
        : `🎁 +${r.gold} 🪙${r.gems ? ` · +${r.gems} 💎` : ""}`, "reward");
      await Promise.all([load(), ctx.refresh()]);
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (!d) return null;
  const c = ctx.state.character;
  const toStart = Math.max(0, Math.floor((Date.parse(d.nextStartsAt) - now) / 1000));
  const toEnd = Math.max(0, Math.floor((Date.parse(d.endsAt) - now) / 1000));
  const live = d.open && !d.defeated;
  const noEnergy = c.energy < WORLD_BOSS_RULES.energy;
  const myItems = WORLD_BOSS_ITEMS[c.race] ?? [];
  const pos = d.myPos || d.participants + 1;
  const rw = worldBossReward(true, c.level, pos);

  return (
    <Panel className="overflow-hidden">
      <div className="md:grid md:grid-cols-[300px_1fr]">
      <motion.div key={shake} animate={shake ? { x: [0, -10, 10, -5, 5, 0] } : {}} transition={{ duration: 0.25 }} className="relative aspect-square w-full bg-black md:self-start">
        <Image src={d.boss.image} alt={t(d.boss.name)} fill sizes="(min-width: 768px) 300px, 100vw" className={`object-cover ${d.defeated ? "grayscale" : live ? "" : "opacity-60"}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-panel via-transparent to-black/30" />
        <div className="absolute left-3 top-3 rounded bg-ember px-2 py-0.5 text-xs font-bold">{t("🌋 CHEFE DO MUNDO · TODO DIA ÀS 21H")}</div>
        <div className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-0.5 text-xs">
          {live ? <span className="text-red-300">● {t("AO VIVO · termina em {tempo}", { tempo: fmtTime(toEnd) })}</span> : t("Próximo em {tempo}", { tempo: fmtTime(toStart) })}
        </div>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <AnimatePresence>
            {hits.map((h, i) => (
              <motion.span key={`${shake}-${i}`} initial={{ y: 0, opacity: 1, scale: 0.6 }} animate={{ y: -80 - i * 6, opacity: 0, scale: 1.3, x: (i % 2 ? 1 : -1) * (20 + i * 12) }}
                transition={{ duration: 1.2 }} className={`absolute font-display text-3xl font-black drop-shadow-[0_2px_4px_#000] ${h.miss ? "text-white/70" : h.crit ? "text-amber-300" : h.skill ? "text-violet-300" : "text-red-400"}`}>
                {h.miss ? t("Errou") : `-${h.dmg}`}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
        {d.defeated && <div className="absolute inset-0 grid place-items-center"><p className="font-display text-4xl font-black text-gold drop-shadow-[0_0_20px_#000] sm:text-5xl">{t("DERROTADO!")}</p></div>}
      </motion.div>

      <div className="space-y-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl">{t(d.boss.name)}</h2>
          <p className="text-xs text-white/60">{t(d.boss.lore)}</p>
        </div>
        <Bar label={t("Vida do chefe (todos os jogadores juntos) · {n} participantes", { n: d.participants })} value={d.hp} max={d.maxHp} color="bg-life" />

        <div className="flex flex-wrap items-center gap-3">
          {d.canClaim ? (
            <button className="btn-gold" disabled={busy} onClick={claim}>🎁 {t("Resgatar recompensa")}</button>
          ) : live ? (
            <button className="btn-gold px-8 text-lg" disabled={busy || d.attacksLeft <= 0 || noEnergy} onClick={attack}>
              {t("⚔️ Atacar ({a}/{b})", { a: d.attacksLeft, b: WORLD_BOSS_RULES.attacksPerEvent })} · ⚡ {WORLD_BOSS_RULES.energy}
            </button>
          ) : (
            <p className="text-sm text-white/70">
              {d.claimed ? t("✔ Recompensa resgatada. Volte às 21h!") : t("O chefe aparece todo dia às 21h (horário de Brasília) e fica 1 hora.")}
            </p>
          )}
          {live && !d.canClaim && (d.attacksLeft <= 0 || noEnergy) && (
            <span className="basis-full text-xs text-amber-200">
              {d.attacksLeft <= 0
                ? t("Você já usou seus {n} ataques deste evento. Os outros jogadores ainda podem atacar!", { n: WORLD_BOSS_RULES.attacksPerEvent })
                : t("Sem energia: cada ataque gasta ⚡ {n} e você tem ⚡ {e}. A energia volta com o tempo.", { n: WORLD_BOSS_RULES.energy, e: c.energy })}
            </span>
          )}
          {d.myDamage > 0 && <span className="text-sm text-white/70">{t("Seu dano: {n} · {p}º lugar", { n: d.myDamage.toLocaleString(t.locale), p: d.myPos })}</span>}
        </div>

        <div className="rounded-lg bg-black/30 p-3 text-xs text-white/70">
          <p className="mb-2">
            {t("Cada ataque são {r} golpes com seus atributos e equipamentos (até {a} ataques por evento). Se o chefe cair, quem causou dano ganha 🪙 {g} + 💎 5 (mais 💎 no top 10) e tem chance de um item EXCLUSIVO da sua raça: {c}% (top 1: {t1}%, top 3: {t3}%, top 10: {t10}%).",
              { r: WORLD_BOSS_RULES.rounds, a: WORLD_BOSS_RULES.attacksPerEvent, g: rw.gold, c: Math.round(itemChance(99) * 100), t1: Math.round(itemChance(1) * 100), t3: Math.round(itemChance(3) * 100), t10: Math.round(itemChance(10) * 100) })}
          </p>
          <p className="mb-2 text-amber-200/90">{t("🛡️ Chefe de grupo: cada ataque tira no máximo {p}% da vida dele. Sozinho ninguém derruba — chame a guilda e os amigos!", { p: Math.round(WORLD_BOSS_RULES.maxHitPct * 100) })}</p>
          <div className="flex flex-wrap gap-2">
            {myItems.map((id) => ITEM_BY_ID[id] && (
              <span key={id} className="flex items-center gap-2 rounded-md bg-amber-500/10 px-2 py-1 ring-1 ring-amber-400/30">
                <Image src={ITEM_BY_ID[id].image} alt="" width={28} height={28} className="rounded" />
                <span className="text-amber-200">{t(ITEM_BY_ID[id].name)}</span>
              </span>
            ))}
          </div>
        </div>

        {d.ranking.length > 0 && (
          <div>
            <h3 className="mb-1.5 font-display text-gold">{t("Maior dano de hoje")}</h3>
            <ol className="space-y-1">
              {d.ranking.map((r) => (
                <li key={r.pos} className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm ${r.me ? "bg-gold/10" : "bg-black/30"}`}>
                  <span className="w-6 font-display">{["🥇", "🥈", "🥉"][r.pos - 1] ?? r.pos}</span>
                  <span className="flex-1 truncate">{r.name}</span>
                  <b className="text-gold">{r.damage.toLocaleString(t.locale)}</b>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
      </div>
    </Panel>
  );
}
