"use client";

import { useEffect, useState } from "react";
import { fmtTime } from "./api";
import { useT } from "@/lib/i18n/client";

type Ev = { id: string; name: string; description: string; kind: "xp" | "gold"; multiplier: number; endsAt: string };

/** Faixa com os eventos ativos (XP/ouro em dobro etc.). */
export default function EventBanner({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const [events, setEvents] = useState<Ev[]>([]);
  const [, tick] = useState(0);
  useEffect(() => {
    fetch("/api/events").then((r) => (r.ok ? r.json() : { events: [] })).then((d) => setEvents(d.events ?? [])).catch(() => {});
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!events.length) return null;
  return (
    <div className={`flex flex-wrap justify-center gap-2 ${compact ? "" : "mt-3"}`}>
      {events.map((e) => (
        <div key={e.id} className="relative overflow-hidden rounded-full bg-gradient-to-r from-amber-500/90 via-orange-500/90 to-fuchsia-600/90 px-4 py-1.5 text-sm font-semibold text-ink shadow-lg">
          <span className="relative">🎉 {t(e.name)}: {e.kind === "xp" ? "XP" : t("Ouro")} ×{e.multiplier} · {t("termina em {tempo}", { tempo: fmtTime((new Date(e.endsAt).getTime() - Date.now()) / 1000) })}</span>
        </div>
      ))}
    </div>
  );
}
