"use client";
import { motion } from "motion/react";

export function Bar({ label, value, max, color, hint }: { label?: string; value: number; max: number; color: string; hint?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-xs text-white/70">
          <span>{label}</span>
          <span>{value}/{max}{hint ? ` · ${hint}` : ""}</span>
        </div>
      )}
      <div className="h-2.5 overflow-hidden rounded-full bg-black/50">
        <motion.div className={`h-full ${color}`} initial={false} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
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
