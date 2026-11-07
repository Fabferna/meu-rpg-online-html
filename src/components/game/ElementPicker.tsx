"use client";

import { useState } from "react";
import type { GameCtx } from "./GameApp";
import { BEATS, ELEMENTS, ELEMENT_ADVANTAGE, ELEMENT_CHANGE_GEMS, ELEMENT_DISADVANTAGE, ELEMENT_INFO, type Element } from "@/lib/game/elements";
import { post } from "./api";
import { Panel } from "./ui";
import { play } from "./sfx";
import { useT } from "@/lib/i18n/client";

const pct = (m: number) => Math.round(Math.abs(m - 1) * 100);

/** Escolha do elemento do herói (aba Herói). A vantagem é aplicada no servidor, em todo combate. */
export default function ElementPicker({ ctx }: { ctx: GameCtx }) {
  const t = useT();
  const cur = ctx.state.character.element;
  const [busy, setBusy] = useState(false);
  const weakTo = (e: Element) => ELEMENTS.filter((x) => BEATS[x].includes(e));

  async function pick(e: Element) {
    if (e === cur) return;
    const label = `${ELEMENT_INFO[e].icon} ${t(ELEMENT_INFO[e].label)}`;
    if (cur && !confirm(t("Trocar seu elemento para {x} por 💎 {g}?", { x: label, g: ELEMENT_CHANGE_GEMS }))) return;
    setBusy(true);
    try {
      await post("/api/character/element", { element: e });
      play("skill");
      ctx.toast(t("Seu elemento agora é {x}!", { x: label }), "reward");
      await ctx.refresh();
    } catch (err) {
      ctx.toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="p-5">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg text-gold">{t("Elemento")}</h3>
        <span className="text-xs text-white/50">{cur ? t("Trocar custa 💎 {g}", { g: ELEMENT_CHANGE_GEMS }) : t("Primeira escolha grátis")}</span>
      </div>
      <p className="mb-3 text-xs text-white/60">
        {t("Contra o elemento que o seu vence você causa +{a}% de dano; contra quem vence o seu, −{d}%. Vale também para os inimigos. Fogo › Ar › Terra › Água › Fogo · Luz ⇄ Sombra.",
          { a: pct(ELEMENT_ADVANTAGE), d: pct(ELEMENT_DISADVANTAGE) })}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ELEMENTS.map((e) => {
          const i = ELEMENT_INFO[e], on = cur === e;
          return (
            <button key={e} disabled={busy || (!!cur && !on && ctx.state.wallet.gems < ELEMENT_CHANGE_GEMS)} onClick={() => pick(e)} aria-pressed={on}
              className={`min-h-11 rounded-lg p-2 text-left text-sm ring-1 transition disabled:opacity-50 ${on ? "bg-gold/15 ring-gold" : "bg-black/30 ring-white/10 hover:bg-white/5"}`}>
              <p className={`font-display ${i.color}`}>{i.icon} {t(i.label)}{on ? " ✓" : ""}</p>
              <p className="text-[11px] text-white/60">
                {t("Forte contra")} {BEATS[e].map((x) => ELEMENT_INFO[x].icon).join(" ")} · {t("fraco contra")} {weakTo(e).map((x) => ELEMENT_INFO[x].icon).join(" ")}
              </p>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
