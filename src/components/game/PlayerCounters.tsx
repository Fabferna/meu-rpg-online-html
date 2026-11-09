"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { useT } from "@/lib/i18n/client";

type Counters = { registered: number; online: number };

/** Número que "rola" até o valor novo. */
function Rolling({ value, locale }: { value: number; locale: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (reduce) { setShown(value); return; }
    const c = animate(shown, value, { duration: 0.8, ease: "easeOut", onUpdate: (v) => setShown(Math.round(v)) });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce]);
  return <b className="font-display tabular-nums text-gold">{shown.toLocaleString(locale)}</b>;
}

/**
 * Marcadores "Jogadores Registrados" e "Jogadores Online".
 * • heartbeat (dentro do jogo): a cada minuto avisa o servidor que o jogador está online e recebe os totais.
 * • sem heartbeat (página inicial): só lê os totais, a cada 30 s.
 * Com a aba escondida nada é enviado: quem deixa o jogo de lado sai da contagem em poucos minutos.
 */
export default function PlayerCounters({ heartbeat = false, compact = false }: { heartbeat?: boolean; compact?: boolean }) {
  const t = useT();
  const [c, setC] = useState<Counters | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const r = heartbeat
          ? await fetch("/api/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
          : await fetch("/api/stats", { cache: "no-store" });
        // No modo demonstração (ou se o batimento falhar) ainda dá para mostrar os totais.
        const res = r.ok || !heartbeat ? r : await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) return;
        const d = await res.json();
        if (alive && typeof d.registered === "number" && typeof d.online === "number") setC({ registered: d.registered, online: d.online });
      } catch { /* sem rede: mantém o último valor */ }
    };
    load();
    const id = setInterval(load, heartbeat ? 60_000 : 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { alive = false; clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [heartbeat]);

  if (!c) return null;
  const pill = compact
    ? "flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] text-white/70"
    : "flex items-center gap-2 rounded-full border border-gold/25 bg-black/40 px-4 py-2 text-sm text-white/80 backdrop-blur";
  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${compact ? "" : "mt-6"}`} aria-live="polite">
      <span className={pill} title={t("Jogadores com o jogo aberto agora")}>
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70 motion-reduce:animate-none" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <Rolling value={c.online} locale={t.locale} /> {t("Jogadores Online")}
      </span>
      <span className={pill} title={t("Total de contas criadas")}>
        <span aria-hidden>🛡️</span>
        <Rolling value={c.registered} locale={t.locale} /> {t("Jogadores Registrados")}
      </span>
    </div>
  );
}
