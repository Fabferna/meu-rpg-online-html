"use client";

import { useEffect, useState } from "react";
import type { GameCtx } from "./GameApp";
import { post } from "./api";
import { Panel } from "./ui";
import { useT } from "@/lib/i18n/client";

/** Resetar (volta ao nível 1) ou excluir o herói (para criar outro). */
export default function HeroManage({ ctx }: { ctx: GameCtx }) {
  const t = useT();
  const [open, setOpen] = useState<"reset" | "delete" | null>(null);
  const [costs, setCosts] = useState<{ resetCost: number; deleteCost: number } | null>(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const name = ctx.state.character.name;

  useEffect(() => {
    if (open && !costs) fetch("/api/character/manage", { cache: "no-store" }).then((r) => r.json()).then(setCosts).catch(() => {});
  }, [open, costs]);

  async function go() {
    if (!open) return;
    setBusy(true);
    try {
      await post("/api/character/manage", { mode: open, confirm });
      if (open === "delete") { window.location.href = "/criar-personagem"; return; }
      ctx.toast(t("Herói resetado. Uma nova jornada começa!"), "reward");
      setOpen(null); setConfirm(""); setCosts(null);
      await ctx.refresh();
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const cost = open === "reset" ? costs?.resetCost : costs?.deleteCost;
  return (
    <Panel className="p-4 text-sm">
      <details>
        <summary className="cursor-pointer font-display text-white/70">⚙️ {t("Gerenciar herói")}</summary>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => { setOpen("reset"); setConfirm(""); }} className="rounded-lg bg-amber-700/40 px-4 py-2 hover:bg-amber-700/60">🔄 {t("Resetar herói")}</button>
          <button onClick={() => { setOpen("delete"); setConfirm(""); }} className="rounded-lg bg-red-900/50 px-4 py-2 hover:bg-red-900/70">🗑️ {t("Excluir herói")}</button>
        </div>
        {open && (
          <div className="mt-3 space-y-2 rounded-lg bg-black/40 p-3">
            <p>{open === "reset"
              ? t("Resetar: {x} volta ao nível 1, com atributos, habilidades, história e itens zerados.", { x: name })
              : t("Excluir: {x} é apagado e você poderá criar um herói novo (outro nome e raça).", { x: name })}</p>
            <p className="text-white/60">{t("Você mantém: ouro, gemas, cosméticos, pets e passe de temporada.")}</p>
            <p className="text-gold">{costs ? (cost ? t("Custo: 🪙 {n}", { n: cost }) : t("Grátis (primeira vez)")) : t("Carregando…")}</p>
            <label className="block">
              <span className="text-white/70">{t("Para confirmar, digite o nome do herói:")} <b>{name}</b></span>
              <input className="input mt-1" value={confirm} onChange={(e) => setConfirm(e.target.value)} maxLength={16} autoComplete="off" />
            </label>
            <div className="flex gap-2">
              <button disabled={busy || !costs || confirm.trim().toLowerCase() !== name.toLowerCase()} onClick={go}
                className={`rounded-lg px-4 py-2 font-display disabled:opacity-40 ${open === "delete" ? "bg-red-700" : "bg-amber-600"}`}>
                {open === "reset" ? t("Confirmar reset") : t("Excluir para sempre")}
              </button>
              <button onClick={() => setOpen(null)} className="rounded-lg bg-white/10 px-4 py-2">{t("Cancelar")}</button>
            </div>
          </div>
        )}
      </details>
    </Panel>
  );
}
