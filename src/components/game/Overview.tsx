"use client";

import { useState } from "react";
import Image from "next/image";
import type { GameCtx } from "./GameApp";
import { post } from "./api";
import { Bar, Panel } from "./ui";

const ATTRS = [
  { k: "str", label: "Força", hint: "Dano físico" },
  { k: "dex", label: "Destreza", hint: "Esquiva, crítico, energia máx." },
  { k: "con", label: "Constituição", hint: "Vida e defesa" },
  { k: "intel", label: "Inteligência", hint: "Dano da habilidade" },
  { k: "wis", label: "Sabedoria", hint: "(em breve)" },
  { k: "cha", label: "Carisma", hint: "(em breve)" },
] as const;
type K = (typeof ATTRS)[number]["k"];

export default function Overview({ ctx, energyHint }: { ctx: GameCtx; energyHint: string }) {
  const c = ctx.state.character;
  const empty = { str: 0, dex: 0, con: 0, intel: 0, wis: 0, cha: 0 };
  const [add, setAdd] = useState<Record<K, number>>(empty);
  const [busy, setBusy] = useState(false);
  const used = Object.values(add).reduce((a, b) => a + b, 0);
  const left = c.attributePoints - used;

  async function confirm() {
    setBusy(true);
    try {
      await post("/api/character/attributes", add);
      ctx.toast("Atributos distribuídos!");
      setAdd(empty);
      await ctx.refresh();
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function potion() {
    try {
      await post("/api/inventory/use", { itemId: "pocao_vida" });
      ctx.toast("❤️ +60 de vida");
      await ctx.refresh();
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    }
  }
  const potions = ctx.state.inventory.find((i) => i.itemId === "pocao_vida")?.qty ?? 0;

  return (
    <div className="grid gap-5 md:grid-cols-[320px_1fr]">
      <Panel className="p-5">
        <div className="relative mx-auto aspect-[3/4] w-full max-w-60 overflow-hidden rounded-lg ring-2 ring-gold/40 md:max-w-none">
          <Image src={c.portrait} alt={c.name} fill sizes="320px" className="object-cover" priority />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4">
            <h1 className="font-display text-2xl">{c.name}</h1>
            <p className="text-sm text-white/70">{c.raceName} · {c.regionName}</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <Bar label="Vida" value={c.hp} max={c.maxHp} color="bg-life" />
          <Bar label="Energia" value={c.energy} max={c.maxEnergy} color="bg-energy" hint={energyHint} />
          <Bar label={`Nível ${c.level} · XP`} value={c.xp} max={c.xpToNext} color="bg-arcane" />
        </div>
        <button onClick={potion} disabled={!potions || c.hp >= c.maxHp}
          className="mt-4 w-full rounded-lg bg-life/30 py-2 text-sm hover:bg-life/40 disabled:opacity-40">
          🧪 Usar Poção de Vida ({potions})
        </button>
      </Panel>

      <div className="space-y-5">
        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-gold">Atributos</h2>
            {c.attributePoints > 0 && <span className="rounded-full bg-arcane/30 px-3 py-1 text-xs">{left} ponto(s) livre(s)</span>}
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {ATTRS.map(({ k, label, hint }) => (
              <li key={k} className="flex items-center gap-3 rounded-lg bg-black/30 px-3 py-2">
                <div className="flex-1">
                  <p className="text-sm">{label}</p>
                  <p className="text-[11px] text-white/40">{hint}</p>
                </div>
                <span className="font-display text-xl">
                  {c.attributes[k] + add[k]}
                  {add[k] > 0 && <span className="ml-1 text-sm text-emerald-400">+{add[k]}</span>}
                </span>
                {c.attributePoints > 0 && (
                  <div className="flex gap-1">
                    <button className="h-7 w-7 rounded bg-white/10 disabled:opacity-30" disabled={!add[k]} onClick={() => setAdd({ ...add, [k]: add[k] - 1 })}>−</button>
                    <button className="h-7 w-7 rounded bg-gold/80 text-ink disabled:opacity-30" disabled={left <= 0} onClick={() => setAdd({ ...add, [k]: add[k] + 1 })}>+</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {used > 0 && <button className="btn-gold mt-4 w-full" disabled={busy} onClick={confirm}>Confirmar distribuição</button>}
        </Panel>

        <Panel className="grid grid-cols-2 gap-3 p-5 text-center sm:grid-cols-4">
          <Stat label="Vitórias PVE" value={c.pveWins} />
          <Stat label="Rating PVP" value={c.pvpRating} />
          <Stat label="Vitórias PVP" value={c.pvpWins} />
          <Stat label="Derrotas PVP" value={c.pvpLosses} />
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-black/30 py-3">
      <p className="font-display text-2xl text-gold">{value}</p>
      <p className="text-xs text-white/50">{label}</p>
    </div>
  );
}
