"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import { GUILD_BOSS_REWARD, GUILD_BOSS_RULES } from "@/lib/game/guildBoss";
import { secondsToWeekEnd } from "@/lib/game/weekly";
import { fmtTime, post } from "./api";
import { Bar, Panel } from "./ui";
import { play } from "./sfx";
import { useT } from "@/lib/i18n/client";

type BossView = {
  week: string; boss: { id: string; name: string; image: string; lore: string }; hp: number; maxHp: number; defeated: boolean;
  ranking: { pos: number; name: string; damage: number; attacks: number; me: boolean }[]; myDamage: number; claimed: boolean; isTop: boolean;
};
type Data = { guild: boolean; current: BossView; previous: BossView | null; attacksLeft: number };
type Hit = { dmg: number; crit: boolean; miss: boolean; skill: boolean };

export default function GuildBoss({ ctx }: { ctx: GameCtx }) {
  const t = useT();
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [shake, setShake] = useState(0);

  const load = useCallback(async () => {
    const r = await fetch("/api/guild-boss", { cache: "no-store" });
    if (r.ok) setD(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  async function attack() {
    setBusy(true);
    try {
      const r = await post<{ dealt: number; defeated: boolean; hits: Hit[] }>("/api/guild-boss/attack");
      setHits([]);
      r.hits.forEach((h, i) => setTimeout(() => {
        setHits((cur) => [...cur, h]); setShake((n) => n + 1);
        play(h.miss ? "miss" : h.crit ? "crit" : h.skill ? "skill" : "hit");
      }, i * 260));
      setTimeout(async () => {
        ctx.toast(r.defeated ? t("👑 O CHEFE CAIU! Resgate sua recompensa.") : t("Você causou {n} de dano!", { n: r.dealt.toLocaleString(t.locale) }), r.defeated ? "reward" : "ok");
        if (r.defeated) play("victory");
        await Promise.all([load(), ctx.refresh()]);
      }, r.hits.length * 260 + 300);
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setTimeout(() => setBusy(false), 1900);
    }
  }

  async function claim(week: "current" | "previous") {
    setBusy(true);
    try {
      const r = await post<{ gems: number; gold: number }>("/api/guild-boss/claim", { week });
      play("coin");
      ctx.toast(`🎁 +${r.gems} 💎 · +${r.gold} 🪙`, "reward");
      await Promise.all([load(), ctx.refresh()]);
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (!d) return <p className="text-white/50">{t("Carregando chefe…")}</p>;
  const b = d.current;
  const noEnergy = ctx.state.character.energy < GUILD_BOSS_RULES.energy;

  return (
    <div className="space-y-5">
      {d.previous && (
        <Panel className="flex flex-wrap items-center gap-3 p-4 ring-1 ring-gold">
          <span className="text-2xl">🎁</span>
          <p className="flex-1 text-sm">{t("Sua guilda derrotou o")} <b>{t(d.previous.boss.name)}</b> {t("na semana passada. Você ajudou com {n} de dano!", { n: d.previous.myDamage.toLocaleString(t.locale) })}</p>
          <button className="btn-gold" disabled={busy} onClick={() => claim("previous")}>{t("Resgatar")}</button>
        </Panel>
      )}

      <Panel className="overflow-hidden">
        <motion.div key={shake} animate={shake ? { x: [0, -10, 10, -5, 5, 0] } : {}} transition={{ duration: 0.25 }} className="relative aspect-[21/9] max-h-80 w-full bg-black">
          <Image src={b.boss.image} alt={t(b.boss.name)} fill sizes="1100px" className={`object-cover ${b.defeated ? "grayscale" : ""}`} priority />
          <div className="absolute inset-0 bg-gradient-to-t from-panel via-transparent to-black/30" />
          <div className="absolute left-4 top-4 rounded bg-ember px-2 py-0.5 text-xs font-bold">{t("CHEFE DA GUILDA · SEMANAL")}</div>
          <div className="absolute right-4 top-4 rounded bg-black/60 px-2 py-0.5 text-xs">{t("Termina em {tempo}", { tempo: fmtTime(secondsToWeekEnd()) })}</div>
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <AnimatePresence>
              {hits.map((h, i) => (
                <motion.span key={`${shake}-${i}`} initial={{ y: 0, opacity: 1, scale: 0.6 }} animate={{ y: -80 - i * 6, opacity: 0, scale: 1.3, x: (i % 2 ? 1 : -1) * (20 + i * 12) }}
                  transition={{ duration: 1.2 }} className={`absolute font-display text-3xl font-black drop-shadow-[0_2px_4px_#000] ${h.miss ? "text-white/70" : h.crit ? "text-amber-300" : h.skill ? "text-violet-300" : "text-red-400"}`}>
                  {h.miss ? "Errou" : `-${h.dmg}`}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
          {b.defeated && <div className="absolute inset-0 grid place-items-center"><p className="font-display text-5xl font-black text-gold drop-shadow-[0_0_20px_#000]">{t("DERROTADO!")}</p></div>}
        </motion.div>
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl">{t(b.boss.name)}</h2>
            <p className="text-xs text-white/60">{t(b.boss.lore)}</p>
          </div>
          <Bar label={t("Vida do chefe (compartilhada pela guilda)")} value={b.hp} max={b.maxHp} color="bg-life" />
          <div className="flex flex-wrap items-center gap-3">
            {b.defeated ? (
              b.myDamage > 0 && !b.claimed
                ? <button className="btn-gold" disabled={busy} onClick={() => claim("current")}>{t("Resgatar")} 💎 {GUILD_BOSS_REWARD.gems + (b.isTop ? GUILD_BOSS_REWARD.topGems : 0)} + 🪙 {GUILD_BOSS_REWARD.gold}</button>
                : <p className="text-sm text-emerald-300">{b.claimed ? t("✔ Recompensa resgatada.") : t("Chefe derrotado. Participe na próxima semana!")}</p>
            ) : (
              <button className="btn-gold px-8 text-lg" disabled={busy || d.attacksLeft <= 0 || noEnergy} onClick={attack}>
                {t("⚔️ Atacar ({a}/{b} hoje)", { a: d.attacksLeft, b: GUILD_BOSS_RULES.attacksPerDay })} · ⚡ {GUILD_BOSS_RULES.energy}
              </button>
            )}
            <p className="text-xs text-white/50">
              {t("Cada ataque são {r} golpes com seus atributos e equipamentos. Quem causar dano ganha 💎 {g} + 🪙 {o} quando o chefe cair; quem causar mais dano ganha 💎 {x} extras. A guilda ganha +200 pontos na Guerra.", { r: GUILD_BOSS_RULES.rounds, g: GUILD_BOSS_REWARD.gems, o: GUILD_BOSS_REWARD.gold, x: GUILD_BOSS_REWARD.topGems })}
            </p>
          </div>
        </div>
      </Panel>

      <Panel className="p-4">
        <h3 className="mb-2 font-display text-lg text-gold">{t("Maior dano da semana")}</h3>
        {b.ranking.length === 0 ? <p className="text-sm text-white/50">{t("Ninguém atacou ainda. Dê o primeiro golpe!")}</p> : (
          <ol className="space-y-1.5">
            {b.ranking.map((r) => (
              <li key={r.name} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${r.me ? "bg-gold/10" : "bg-black/30"}`}>
                <span className="w-6 font-display">{["🥇", "🥈", "🥉"][r.pos - 1] ?? r.pos}</span>
                <span className="flex-1 truncate">{r.name}</span>
                <span className="text-white/50">{r.attacks} ataques</span>
                <b className="w-24 text-right text-gold">{r.damage.toLocaleString(t.locale)}</b>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}
