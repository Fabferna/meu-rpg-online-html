"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { PlayerState } from "@/lib/game/state";
import { ENERGY_REGEN_SECONDS } from "@/lib/game/rules";

// Somente VISUAL: o timer de energia aqui é uma previsão. O valor real é
// sempre recalculado pelo servidor a cada ação / atualização.
export default function GameHud({ initial }: { initial: PlayerState }) {
  const [state, setState] = useState(initial);
  const [countdown, setCountdown] = useState(initial.character.nextEnergyInSec);
  const c = state.character;

  useEffect(() => {
    if (c.energy >= c.maxEnergy) return;
    const t = setInterval(() => {
      setCountdown((s) => {
        if (s > 1) return s - 1;
        fetch("/api/character", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((fresh: PlayerState | null) => fresh && setState(fresh));
        return ENERGY_REGEN_SECONDS;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [c.energy, c.maxEnergy]);

  const menus = ["Missões", "Batalha PVE", "Arena PVP", "Inventário", "Loja", "Ranking"];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="panel flex flex-wrap items-center justify-between gap-4 px-5 py-3">
        <span className="font-display text-xl font-black text-gold">Aethelgard</span>
        <div className="flex items-center gap-4 text-sm">
          <span title="Ouro (moeda do jogo)">🪙 <b>{state.wallet.gold.toLocaleString("pt-BR")}</b></span>
          <span title="Gemas (moeda premium)">💎 <b>{state.wallet.gems.toLocaleString("pt-BR")}</b></span>
          <form action="/auth/signout" method="post">
            <button className="rounded-md border border-white/15 px-3 py-1.5 hover:bg-white/5">Sair</button>
          </form>
        </div>
      </header>

      <div className="mt-6 grid gap-6 md:grid-cols-[300px_1fr]">
        <aside className="panel p-5 fade-up">
          <div className="relative mx-auto aspect-[3/4] w-full overflow-hidden rounded-lg ring-2 ring-gold/40">
            <Image src={c.portrait} alt={c.name} fill sizes="300px" className="object-cover" priority />
          </div>
          <h1 className="mt-4 text-center font-display text-2xl">{c.name}</h1>
          <p className="text-center text-sm text-white/60">{c.raceName} · {c.regionName}</p>
          <p className="mt-1 text-center font-display text-gold">Nível {c.level}</p>

          <div className="mt-5 space-y-3">
            <Bar label="Vida" value={c.hp} max={c.maxHp} color="bg-life" />
            <Bar label="Energia" value={c.energy} max={c.maxEnergy} color="bg-energy"
              hint={c.energy < c.maxEnergy ? `+1 em ${fmt(countdown)}` : "cheia"} />
            <Bar label="XP" value={c.xp} max={c.xpToNext} color="bg-arcane" />
          </div>

          <dl className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
            {([["FOR", c.attributes.str], ["DES", c.attributes.dex], ["CON", c.attributes.con], ["INT", c.attributes.intel], ["SAB", c.attributes.wis], ["CAR", c.attributes.cha]] as const).map(([k, v]) => (
              <div key={k} className="rounded-md bg-black/40 py-2">
                <dt className="text-white/50">{k}</dt>
                <dd className="font-display text-base">{v}</dd>
              </div>
            ))}
          </dl>
        </aside>

        <section className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {menus.map((m, i) => (
              <button key={m} style={{ animationDelay: `${i * 60}ms` }}
                className="panel fade-up p-6 text-left transition hover:-translate-y-1 hover:ring-1 hover:ring-gold/50">
                <span className="font-display text-lg">{m}</span>
                <span className="mt-1 block text-xs text-white/50">Em breve (Fase 2)</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Bar({ label, value, max, color, hint }: { label: string; value: number; max: number; color: string; hint?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-white/70">
        <span>{label}</span>
        <span>{value}/{max}{hint ? ` · ${hint}` : ""}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-black/50">
        <div className={`h-full ${color} transition-[width] duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
