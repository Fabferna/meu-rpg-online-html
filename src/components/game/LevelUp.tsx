"use client";

import { AnimatePresence, motion } from "motion/react";
import { QUESTS } from "@/lib/game/quests";
import { ENEMIES } from "@/lib/game/enemies";
import { ITEMS } from "@/lib/game/items";
import { ATTRIBUTE_POINTS_PER_LEVEL } from "@/lib/game/rules";
import { useT } from "@/lib/i18n/client";
import type { TFn } from "@/lib/i18n/translate";

/** O que fica disponível ao passar do nível `from` para `to`. */
export function unlocksBetween(t: TFn, from: number, to: number) {
  const inRange = (l?: number) => l !== undefined && l > from && l <= to;
  return [
    ...QUESTS.filter((q) => inRange(q.minLevel)).map((q) => `📜 ${t("Missão:")} ${t(q.title)} (${t("rank")} ${q.rank})`),
    ...ENEMIES.filter((e) => !e.story && inRange(e.minLevel)).map((e) => `${e.boss ? `👑 ${t("Chefe")}` : `⚔️ ${t("Inimigo")}`}: ${t(e.name)}`),
    ...ITEMS.filter((i) => i.buy && inRange(i.minLevel)).map((i) => `⚒️ ${t("Ferreiro:")} ${t(i.name)}`),
  ];
}

export default function LevelUp({ level, from, onClose, onSpend }: { level: number | null; from: number; onClose: () => void; onSpend: () => void }) {
  const t = useT();
  const unlocks = level ? unlocksBetween(t, from, level) : [];
  const gained = level ? (level - from) * ATTRIBUTE_POINTS_PER_LEVEL : 0;
  return (
    <AnimatePresence>
      {level && (
        <motion.div className="fixed inset-0 z-[58] grid place-items-center bg-black/80 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div initial={{ scale: 0.5, rotate: -4 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 180, damping: 14 }}
            className="panel relative w-full max-w-sm overflow-hidden p-7 text-center" role="dialog" aria-modal="true" aria-labelledby="lvl-title" onClick={(e) => e.stopPropagation()}>
            {/* Raios de luz girando atrás do número */}
            <motion.div aria-hidden className="pointer-events-none absolute left-1/2 top-16 -z-0 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40"
              style={{ background: "conic-gradient(from 0deg, transparent, #e5b453, transparent 25%, #7b5cff, transparent 50%, #e5b453, transparent 75%)" }}
              animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: "linear" }} />
            <div className="relative">
              <p className="text-sm uppercase tracking-[0.3em] text-white/70">{t("Subiu de nível!")}</p>
              <motion.p id="lvl-title" initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, type: "spring" }}
                className="font-display text-7xl font-black text-gold drop-shadow-[0_0_24px_#e5b45380]">{level}</motion.p>
              <p className="mt-2 text-sm">{t("❤️ Vida restaurada ·")} <b className="text-arcane">{t("+{n} pontos de atributo", { n: gained })}</b></p>
              {unlocks.length > 0 && (
                <div className="mt-5 rounded-lg bg-black/40 p-3 text-left text-sm">
                  <p className="mb-1.5 text-xs uppercase tracking-wider text-gold">{t("Desbloqueado")}</p>
                  <ul className="space-y-1">{unlocks.map((u) => <li key={u}>{u}</li>)}</ul>
                </div>
              )}
              <button className="btn-gold mt-6 w-full" onClick={onSpend}>{t("Distribuir pontos")}</button>
              <button className="mt-3 text-sm text-white/50 hover:text-white" onClick={onClose}>{t("Depois")}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
