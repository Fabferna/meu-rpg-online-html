"use client";

import { useState } from "react";
import TalentTree from "./TalentTree";
import Image from "next/image";
import type { GameCtx } from "./GameApp";
import { SKILL_MAX_LEVEL, SKILL_SLOT_LEVELS, SKILL_UPGRADE_COST, skillPower, skillsOf, skillUpgradeLevel, slotsFor, type Skill } from "@/lib/game/skills";
import { post } from "./api";
import { Panel } from "./ui";
import { play } from "./sfx";
import { useT } from "@/lib/i18n/client";
import type { TFn } from "@/lib/i18n/translate";

const TYPE_LABEL: Record<Skill["type"], [string, string]> = {
  physical: ["⚔️ Física", "bg-ember/30 text-orange-200"],
  magic: ["🔮 Mágica", "bg-arcane/30 text-violet-200"],
  support: ["💚 Suporte", "bg-emerald-700/30 text-emerald-200"],
};

/** Números do nível atual → próximo, para o jogador comparar. */
function stats(t: TFn, s: Skill, lv: number) {
  const p = skillPower(s, Math.max(1, lv));
  return [
    p.mult ? t("Dano: {n}%", { n: Math.round(p.mult * 100 * (s.hits ?? 1)) }) + (s.hits ? ` (${s.hits}×)` : "") : "",
    p.healPct ? t("Cura: {n}% da vida", { n: p.healPct }) : "",
    s.poison ? t("Veneno: {n} turnos", { n: s.poison }) : "",
    s.stun ? t("Atordoa: {n} turno(s)", { n: s.stun }) : "",
    s.stone ? t("Dano recebido -50% por {n} turnos", { n: s.stone }) : "",
    s.lifesteal ? t("Rouba {n}% do dano como vida", { n: Math.round(s.lifesteal * 100) }) : "",
    s.selfHpPct ? t("Custa {n}% da sua vida", { n: s.selfHpPct }) : "",
    s.sure ? t("Não pode ser esquivado") : "",
    t("Recarga: {n} turnos", { n: p.cooldown }),
  ].filter(Boolean);
}

export default function Skills({ ctx }: { ctx: GameCtx }) {
  const t = useT();
  const c = ctx.state.character;
  const lo = c.loadout;
  const [busy, setBusy] = useState(false);
  const slots = slotsFor(c.level);
  const list = skillsOf(c.race);

  async function run(url: string, body: object, ok: string) {
    setBusy(true);
    try {
      await post(url, body);
      play("skill");
      ctx.toast(ok, "reward");
      await ctx.refresh();
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const toggle = (id: string) => {
    const eq = lo.eq.includes(id) ? lo.eq.filter((x) => x !== id) : [...lo.eq, id];
    if (!eq.length) return ctx.toast(t("Mantenha pelo menos 1 habilidade na barra."), "error");
    if (eq.length > slots) return ctx.toast(t("Barra cheia: tire uma habilidade antes."), "error");
    run("/api/skills/equip", { eq }, t("Barra de combate atualizada."));
  };

  return (
    <div className="space-y-5">
      <Panel className="p-5">
        <h2 className="font-display text-xl text-gold">{t("✨ Habilidades de {x}", { x: t(c.raceName) })}</h2>
        <p className="mt-1 text-sm text-white/60">{t("Aprenda habilidades ao subir de nível, melhore-as com ouro (até o nível 5) e escolha quais levar para o combate.")}</p>
        <div className="mt-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-white/50">{t("Barra de combate")}</p>
          <div className="flex flex-wrap gap-2">
            {SKILL_SLOT_LEVELS.map((need, i) => {
              const s = list.find((x) => x.id === lo.eq[i]);
              const open = c.level >= need;
              return (
                <div key={i} className={`flex h-16 w-44 items-center gap-2 rounded-lg px-2 ring-1 ${open ? "bg-black/40 ring-gold/40" : "bg-black/20 ring-white/10"}`}>
                  {s ? <><Image src={s.icon} alt="" width={40} height={40} className="rounded" /><span className="text-sm leading-tight">{t(s.name)}<br /><span className="text-[11px] text-gold">{t("Nv.")} {lo.lv[s.id]}</span></span></>
                    : <span className="w-full text-center text-xs text-white/40">{open ? t("Espaço livre") : `🔒 ${t("Nível {n}", { n: need })}`}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 md:grid-cols-2">
        {list.map((s) => {
          const lv = lo.lv[s.id] ?? 0;
          const learned = lv > 0;
          const equipped = lo.eq.includes(s.id);
          const max = lv >= SKILL_MAX_LEVEL;
          const need = learned ? skillUpgradeLevel(s, lv) : s.unlock;
          const cost = learned ? SKILL_UPGRADE_COST[lv] : 0;
          const canUp = !max && c.level >= need && ctx.state.wallet.gold >= cost;
          const [typeLabel, typeColor] = TYPE_LABEL[s.type];
          return (
            <Panel key={s.id} className={`flex gap-3 p-4 ${equipped ? "ring-2 ring-gold" : ""} ${!learned && c.level < s.unlock ? "opacity-60" : ""}`}>
              <div className="relative h-16 w-16 shrink-0">
                <Image src={s.icon} alt="" fill sizes="64px" className={`rounded-lg object-cover ${learned ? "" : "grayscale"}`} />
                {learned && <span className="absolute -bottom-1 -right-1 rounded bg-gold px-1.5 font-display text-xs font-black text-ink">{lv}/{SKILL_MAX_LEVEL}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display">{t(s.name)}</p>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${typeColor}`}>{t(typeLabel)}</span>
                  {equipped && <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[10px] text-gold">{t("Na barra")}</span>}
                </div>
                <p className="mt-1 text-xs text-white/70">{t(s.description)}</p>
                <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-emerald-300">
                  {stats(t, s, lv).map((x) => <li key={x}>{x}</li>)}
                </ul>
                {learned && !max && <p className="mt-1 text-[11px] text-white/40">{t("Próximo nível:")} {stats(t, s, lv + 1).slice(0, 2).join(" · ")}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {!max && (
                    <button disabled={busy || !canUp} onClick={() => run("/api/skills/upgrade", { skillId: s.id }, learned ? t("{x} subiu para o nível {n}!", { x: t(s.name), n: lv + 1 }) : t("Você aprendeu {x}!", { x: t(s.name) }))}
                      className="btn-gold !px-3 !py-1.5 text-xs">
                      {c.level < need ? `🔒 ${t("Nível {n}", { n: need })}` : learned ? `⬆️ ${t("Melhorar")} · 🪙 ${cost}` : `📖 ${t("Aprender")}`}
                    </button>
                  )}
                  {max && <span className="text-xs text-gold">★ {t("Nível máximo")}</span>}
                  {learned && (
                    <button disabled={busy} onClick={() => toggle(s.id)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15">
                      {equipped ? t("Tirar da barra") : t("Colocar na barra")}
                    </button>
                  )}
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
      <TalentTree ctx={ctx} />
    </div>
  );
}
