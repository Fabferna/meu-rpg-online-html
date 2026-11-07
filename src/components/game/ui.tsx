"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Barra de vida/energia/mana/stamina/XP com animação sutil:
 * • o preenchimento desliza até o valor novo (mola suave);
 * • ao PERDER valor, um "rastro" claro fica no lugar antigo e encolhe logo depois (mostra quanto foi perdido);
 * • ao GANHAR valor, a barra brilha por um instante;
 * • um reflexo de luz passa devagar pela parte cheia.
 * Quem prefere menos movimento (configuração do sistema) vê só a barra, sem reflexo nem brilho.
 */
export function Bar({ label, value, max, color, hint, inside }: { label?: string; value: number; max: number; color: string; hint?: string; inside?: boolean }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const reduce = useReducedMotion();
  const prev = useRef(pct);
  const [glow, setGlow] = useState(0);
  useEffect(() => {
    if (pct > prev.current + 0.5) setGlow((n) => n + 1);
    prev.current = pct;
  }, [pct]);
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-xs text-white/70">
          <span>{label}</span>
          <span>{value}/{max}{hint ? ` · ${hint}` : ""}</span>
        </div>
      )}
      <div className={`relative overflow-hidden rounded-full bg-black/50 ${inside ? "h-4" : "h-2.5"}`}>
        {/* Rastro: acompanha o valor com atraso, então aparece só quando o valor cai. */}
        <motion.div className="absolute inset-y-0 left-0 bg-white/35" initial={false} animate={{ width: `${pct}%` }}
          transition={reduce ? { duration: 0 } : { duration: 0.6, delay: 0.35, ease: "easeOut" }} />
        <motion.div className={`relative h-full overflow-hidden ${color}`} initial={false} animate={{ width: `${pct}%` }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22 }}>
          {!reduce && pct > 0 && <span className="bar-shine pointer-events-none absolute inset-0" aria-hidden />}
          {!reduce && glow > 0 && (
            <motion.span key={glow} className="pointer-events-none absolute inset-0 bg-white" aria-hidden
              initial={{ opacity: 0.45 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }} />
          )}
        </motion.div>
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
