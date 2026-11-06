"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { post } from "./api";
import { useT } from "@/lib/i18n/client";

type Hero = { id?: string; name: string; raceName: string; level: number; portrait: string };
type Data = { active: Hero | null; stashed: (Hero & { id: string })[]; slots: number; maxSlots: number; slotPrice: number };

/** Lista de heróis da conta: trocar, criar outro e comprar espaço. Usada no jogo e na criação. */
export default function HeroList({ gems, onError }: { gems?: number; onError?: (m: string) => void }) {
  const t = useT();
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const fail = (e: unknown) => (onError ? onError((e as Error).message) : alert((e as Error).message));

  const load = useCallback(() => fetch("/api/characters", { cache: "no-store" }).then((r) => r.json()).then(setD).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } catch (e) { fail(e); setBusy(false); }
  }
  if (!d || !Array.isArray(d.stashed)) return null;
  if (!d.active && !d.stashed.length) return null;

  const used = d.stashed.length + (d.active ? 1 : 0);
  const free = d.slots - used;
  const all: (Hero & { active?: boolean })[] = [...(d.active ? [{ ...d.active, active: true }] : []), ...d.stashed];

  return (
    <div className="panel p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-gold">👥 {t("Seus heróis")} <span className="text-white/50">({used}/{d.slots})</span></p>
        {d.slots < d.maxSlots && (
          <button disabled={busy || (gems !== undefined && gems < d.slotPrice)}
            onClick={() => run(async () => { await post("/api/characters/slot", {}); await load(); setBusy(false); })}
            className="rounded-lg bg-sky-600/40 px-3 py-1.5 text-xs hover:bg-sky-600/60 disabled:opacity-40">
            ➕ {t("Comprar espaço")} · 💎 {d.slotPrice}
          </button>
        )}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {all.map((h) => (
          <div key={h.name} className={`flex items-center gap-3 rounded-lg p-2 ${h.active ? "bg-gold/15 ring-1 ring-gold" : "bg-black/30"}`}>
            <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-md"><Image src={h.portrait} alt="" fill sizes="44px" className="object-cover" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display">{h.name}</p>
              <p className="text-[11px] text-white/60">{t(h.raceName)} · {t("Nv.")} {h.level}</p>
            </div>
            {h.active ? <span className="text-[11px] text-gold">{t("Jogando")}</span> : (
              <button disabled={busy} onClick={() => run(async () => { await post("/api/characters/switch", { stashId: h.id }); window.location.href = "/jogo"; })}
                className="btn-gold !px-3 !py-1.5 text-xs">{t("Jogar")}</button>
            )}
          </div>
        ))}
        {d.active && free > 0 && (
          <button disabled={busy} onClick={() => run(async () => { await post("/api/characters/new", {}); window.location.href = "/criar-personagem"; })}
            className="grid min-h-[4.5rem] place-items-center rounded-lg border border-dashed border-white/20 text-white/70 hover:bg-white/5">
            ＋ {t("Criar outro herói")}
          </button>
        )}
      </div>
      {d.active && <p className="mt-2 text-[11px] text-white/40">{t("Ouro, gemas, cosméticos, pets, passe e guilda são da conta e valem para todos os heróis. Termine missões e batalhas antes de trocar.")}</p>}
    </div>
  );
}
