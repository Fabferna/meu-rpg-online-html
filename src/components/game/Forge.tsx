"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import type { InventoryEntry } from "@/lib/game/state";
import { ITEM_BY_ID, MAX_UPGRADE, upgradeChance, upgradeCost, upgradedStats } from "@/lib/game/items";
import { post } from "./api";
import { play } from "./sfx";

const LABEL: Record<string, string> = { atk: "ATQ", def: "DEF", str: "FOR", dex: "DES", con: "CON", intel: "INT" };

/** Janela da forja: aprimora um item de +0 até +10. */
export default function Forge({ ctx, item, onClose }: { ctx: GameCtx; item: InventoryEntry | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<"ok" | "fail" | null>(null);
  const def = item ? ITEM_BY_ID[item.itemId] : null;
  // Usa o item mais recente do estado (o nível muda após cada tentativa).
  const live = item ? ctx.state.inventory.find((i) => i.id === item.id) ?? item : null;
  const lvl = live?.upgrade ?? 0;
  const next = lvl + 1;
  const maxed = lvl >= MAX_UPGRADE;

  async function forge() {
    if (!live || !def) return;
    setBusy(true); setResult(null);
    try {
      const r = await post<{ success: boolean; upgrade: number }>("/api/smith/upgrade", { inventoryId: live.id });
      setResult(r.success ? "ok" : "fail");
      play(r.success ? (r.upgrade >= 7 ? "levelup" : "victory") : "defeat");
      await ctx.refresh();
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {live && def && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && onClose()}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="panel w-full max-w-md p-6" role="dialog" aria-modal="true" aria-labelledby="forge-title" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 id="forge-title" className="font-display text-xl text-gold">⚒️ Forja</h2>
              <button onClick={onClose} aria-label="Fechar" className="px-2 text-white/50 hover:text-white">✕</button>
            </div>
            <div className="relative mx-auto mt-4 grid h-36 w-36 place-items-center">
              <motion.div aria-hidden key={`${result}-${lvl}`} className="absolute inset-0 rounded-full"
                initial={{ opacity: 0, scale: 0.6 }} animate={result ? { opacity: [0, 0.9, 0], scale: [0.6, 1.4, 1.6] } : {}} transition={{ duration: 0.9 }}
                style={{ background: result === "fail" ? "radial-gradient(circle, #d9572b88, transparent 70%)" : "radial-gradient(circle, #e5b453aa, transparent 70%)" }} />
              <motion.div animate={busy ? { rotate: [0, -8, 8, -8, 0] } : {}} transition={{ repeat: busy ? Infinity : 0, duration: 0.4 }} className="relative h-28 w-28">
                <Image src={def.image} alt="" fill sizes="112px" className="object-contain" />
              </motion.div>
              {lvl > 0 && <span className="absolute -right-1 top-1 rounded-full bg-gold px-2 font-display text-lg font-black text-ink">+{lvl}</span>}
            </div>
            <p className="mt-2 text-center font-display">{def.name}{lvl > 0 ? ` +${lvl}` : ""}</p>
            {result && (
              <motion.p initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`mt-1 text-center font-display text-lg ${result === "ok" ? "text-gold" : "text-red-300"}`}>
                {result === "ok" ? `Sucesso! Agora +${lvl}` : "A forja falhou… o item continua igual."}
              </motion.p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-black/30 p-3 text-sm">
              <p className="text-white/50">Atual (+{lvl})</p>
              <p className="text-white/50">{maxed ? "Máximo" : `Próximo (+${next})`}</p>
              {Object.entries(def.stats).filter(([k]) => k in LABEL).map(([k]) => {
                const cur = upgradedStats(def.stats as Record<string, number>, lvl)[k];
                const nxt = upgradedStats(def.stats as Record<string, number>, Math.min(MAX_UPGRADE, next))[k];
                return [
                  <p key={`${k}c`}>{LABEL[k]} +{cur}</p>,
                  <p key={`${k}n`} className="text-emerald-300">{maxed ? "—" : `${LABEL[k]} +${nxt}`}</p>,
                ];
              })}
            </div>
            {maxed ? (
              <p className="mt-5 text-center text-sm text-gold">Este item atingiu o poder máximo!</p>
            ) : (
              <>
                <div className="mt-4 flex justify-between text-sm">
                  <span>Chance de sucesso: <b className={upgradeChance(next) < 50 ? "text-amber-300" : "text-emerald-300"}>{upgradeChance(next)}%</b></span>
                  <span>Custo: <b>🪙 {upgradeCost(def, next).toLocaleString("pt-BR")}</b></span>
                </div>
                <button className="btn-gold mt-4 w-full" disabled={busy || ctx.state.wallet.gold < upgradeCost(def, next)} onClick={forge}>
                  {busy ? "Forjando…" : `Aprimorar para +${next}`}
                </button>
                <p className="mt-2 text-center text-[11px] text-white/40">Se falhar, o item não quebra nem perde nível: só o ouro é gasto.</p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
