"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { GameCtx } from "./GameApp";
import { DUNGEONS } from "@/lib/game/dungeons";
import { ENEMY_BY_ID } from "@/lib/game/enemies";
import { ITEM_BY_ID } from "@/lib/game/items";
import { post } from "./api";
import { Panel } from "./ui";

export default function Dungeons({ ctx, onEnter }: { ctx: GameCtx; onEnter: () => void }) {
  const [info, setInfo] = useState<{ limit: number; premium: boolean; left: Record<string, number> } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/dungeons", { cache: "no-store" }).then((r) => r.json()).then(setInfo).catch(() => {}); }, []);
  const c = ctx.state.character;

  async function enter(id: string) {
    setBusy(true);
    try {
      await post("/api/dungeons/enter", { dungeonId: id });
      await ctx.refresh();
      onEnter();
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/60">
        Enfrente 3 inimigos seguidos. Entre as lutas você só recupera <b>25% da vida</b>. Vença o guardião para abrir o baú.
        {info && <> Entradas por dia: <b>{info.limit}</b>{info.premium ? " (bônus do Passe Premium)" : ""}.</>}
      </p>
      {DUNGEONS.map((d) => {
        const locked = c.level < d.minLevel;
        const left = info?.left[d.id] ?? 0;
        return (
          <Panel key={d.id} className={`grid overflow-hidden sm:grid-cols-[260px_1fr] ${locked ? "opacity-60" : ""}`}>
            <div className="relative aspect-video sm:aspect-auto">
              <Image src={d.image} alt="" fill sizes="260px" className={`object-cover ${locked ? "grayscale" : ""}`} />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-panel/90" />
            </div>
            <div className="space-y-3 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-xl">{d.name}</h3>
                <span className="text-xs text-white/50">Nível {d.minLevel}+ · ⚡ {d.energy}</span>
              </div>
              <p className="text-sm text-white/60">{d.description}</p>
              <div className="flex items-center gap-2">
                {d.stages.map((s, i) => {
                  const e = ENEMY_BY_ID[s];
                  return (
                    <div key={s + i} className="flex items-center gap-2">
                      <div className={`relative h-12 w-12 overflow-hidden rounded-lg ${i === d.stages.length - 1 ? "ring-2 ring-ember" : "ring-1 ring-white/10"}`} title={e.name}>
                        <Image src={e.image} alt={e.name} fill sizes="48px" className="object-cover" />
                      </div>
                      {i < d.stages.length - 1 && <span className="text-white/30">→</span>}
                    </div>
                  );
                })}
                <span className="ml-2 text-white/30">→</span>
                <span className="text-2xl" title="Baú">🎁</span>
              </div>
              <p className="text-xs text-white/70">Baú: 🪙 {d.chest.gold}{d.chest.gems ? ` + 💎 ${d.chest.gems}` : ""}{d.chest.item ? ` · ${Math.round(d.chest.item.chance * 100)}% de chance: ${ITEM_BY_ID[d.chest.item.id]?.name}` : ""}</p>
              <button className="btn-gold" disabled={busy || locked || left <= 0 || c.energy < d.energy || !!ctx.state.battle || !!ctx.state.quest} onClick={() => enter(d.id)}>
                {locked ? `Requer nível ${d.minLevel}` : left <= 0 ? "Volte amanhã" : `Entrar (${left} hoje)`}
              </button>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
