"use client";
import { motion } from "motion/react";

export function Bar({ label, value, max, color, hint, inside }: { label?: string; value: number; max: number; color: string; hint?: string; inside?: boolean }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-xs text-white/70">
          <span>{label}</span>
          <span>{value}/{max}{hint ? ` · ${hint}` : ""}</span>
        </div>
      )}
      <div className={`relative overflow-hidden rounded-full bg-black/50 ${inside ? "h-4" : "h-2.5"}`}>
        <motion.div className={`h-full ${color}`} initial={false} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        {/* Número dentro da barra (cabeçalho): legível em qualquer cor de fundo. */}
        {inside && (
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold leading-none text-white [text-shadow:0_1px_2px_rgba(0,0,0,.9)]">
            {value}/{max}
          </span>
        )}
      </div>
    </div>
  );
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`panel ${className}`}>
      {children}
    </motion.div>
  );
}

export function RankBadge({ rank }: { rank: string }) {
  const color = { D: "bg-zinc-500", C: "bg-emerald-600", B: "bg-sky-600", A: "bg-fuchsia-600", S: "bg-amber-500 text-ink" }[rank] ?? "bg-zinc-500";
  return <span className={`grid h-8 w-8 place-items-center rounded-md font-display font-black ${color}`}>{rank}</span>;
}
