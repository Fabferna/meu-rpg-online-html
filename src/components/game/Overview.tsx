"use client";

import { useState } from "react";
import Image from "next/image";
import type { GameCtx } from "./GameApp";
import { post } from "./api";
import { play } from "./sfx";
import { Bar, Panel } from "./ui";
import { useT } from "@/lib/i18n/client";
import HeroManage from "./HeroManage";
import HeroList from "./HeroList";
import { combatSummary, equippedPieces, petStats, setStats } from "./gearView";
import { ATTR_LABEL } from "@/lib/game/gear";
import { SLOT_LABEL } from "./Inventory";

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
  const t = useT();
  const c = ctx.state.character;
  const empty = { str: 0, dex: 0, con: 0, intel: 0, wis: 0, cha: 0 };
  const [add, setAdd] = useState<Record<K, number>>(empty);
  const [busy, setBusy] = useState(false);
  const used = Object.values(add).reduce((a, b) => a + b, 0);
  const left = c.attributePoints - used;
  // Bônus dos equipamentos (já com aprimoramento e afinidade), por atributo e por peça.
  const pieces = equippedPieces(ctx.state.inventory, c.race);
  const pet = petStats(ctx.state);
  const sets = setStats(pieces.map((p) => p.piece));
  const gear = (k: string) => [...pieces.map((p) => ({ slot: p.slot, v: p.piece.stats[k] ?? 0 })), { slot: "set", v: sets.reduce((n, b) => n + (b[k] ?? 0), 0) }, { slot: "pet", v: pet[k] ?? 0 }].filter((x) => x.v > 0);
  const gearSum = (k: string) => gear(k).reduce((n, x) => n + x.v, 0);
  const extra = (["atk", "def"] as const).map((k) => ({ k, v: gearSum(k) })).filter((x) => x.v > 0);

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
      play("heal");
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
            <p className="text-sm text-white/70">{t(c.raceName)} · {t(c.regionName)}</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <Bar label={t("Vida")} value={c.hp} max={c.maxHp} color="bg-life" />
          <Bar label={t("Energia")} value={c.energy} max={c.maxEnergy} color="bg-energy" hint={energyHint} />
          <Bar label={t("Nível {n} · XP", { n: c.level })} value={c.xp} max={c.xpToNext} color="bg-arcane" />
        </div>
        <button onClick={potion} disabled={!potions || c.hp >= c.maxHp}
          className="mt-4 w-full rounded-lg bg-life/30 py-2 text-sm hover:bg-life/40 disabled:opacity-40">
          {t("🧪 Usar Poção de Vida ({n})", { n: potions })}
        </button>
      </Panel>

      <div className="space-y-5">
        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-gold">{t("Atributos")}</h2>
            {c.attributePoints > 0 && <span className="rounded-full bg-arcane/30 px-3 py-1 text-xs">{t("{n} ponto(s) livre(s)", { n: left })}</span>}
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {ATTRS.map(({ k, label, hint }) => (
              <li key={k} className="flex items-center gap-3 rounded-lg bg-black/30 px-3 py-2">
                <div className="flex-1">
                  <p className="text-sm">{t(label)}</p>
                  <p className="text-[11px] text-white/40">{t(k === "wis" && c.race === "aetheliano" ? "Reforça a magia" : hint)}</p>
                  {gearSum(k) > 0 && (
                    <p className="text-[11px] text-emerald-300/80">
                      {gear(k).map((x) => `${x.slot === "pet" ? `🐾 ${t("Pet")}` : x.slot === "set" ? `🧩 ${t("Conjunto")}` : t(SLOT_LABEL[x.slot] ?? x.slot)} +${x.v}`).join(" · ")}
                    </p>
                  )}
                </div>
                <span className="text-right font-display text-xl">
                  {c.attributes[k] + add[k]}
                  {add[k] > 0 && <span className="ml-1 text-sm text-gold">+{add[k]}</span>}
                  {gearSum(k) > 0 && (
                    <span className="ml-1 text-sm text-emerald-400" title={t("Bônus dos equipamentos")}>(+{gearSum(k)})</span>
                  )}
                  {gearSum(k) > 0 && <span className="block font-sans text-[10px] text-white/40">{t("Total {n}", { n: c.attributes[k] + add[k] + gearSum(k) })}</span>}
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
          <p className="mt-3 text-[11px] text-white/50">
            <span className="text-emerald-400">(+N)</span> = {t("bônus dos equipamentos (arma, elmo, armadura, botas e acessório), dos conjuntos e do pet ativo")}
            {extra.length > 0 && <> · {t("Equipamentos também dão:")} {extra.map((x) => `${t(x.k === "atk" ? "ATQ" : "DEF")} +${x.v}`).join(" · ")}</>}
          </p>
          {used > 0 && <button className="btn-gold mt-4 w-full" disabled={busy} onClick={confirm}>{t("Confirmar distribuição")}</button>}
        </Panel>

        <CombatStats ctx={ctx} />

        <Panel className="grid grid-cols-2 gap-3 p-5 text-center sm:grid-cols-4">
          <Stat label={t("Vitórias PVE")} value={c.pveWins} />
          <Stat label={t("Rating PVP")} value={c.pvpRating} />
          <Stat label={t("Vitórias PVP")} value={c.pvpWins} />
          <Stat label={t("Derrotas PVP")} value={c.pvpLosses} />
        </Panel>
        <HeroList gems={ctx.state.wallet.gems} onError={(m) => ctx.toast(m, "error")} />
        <HeroManage ctx={ctx} />
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

/** Quadro "Status de combate": números finais do herói, com o bônus de equipamentos/conjuntos/pet entre parênteses. */
function CombatStats({ ctx }: { ctx: GameCtx }) {
  const t = useT();
  const s = combatSummary(ctx.state);
  const plus = (n: number, unit = "") => (n > 0 ? <span className="ml-1 text-sm text-emerald-400">(+{n}{unit})</span> : n < 0 ? <span className="ml-1 text-sm text-red-300">({n}{unit})</span> : null);
  const rows: { icon: string; label: string; hint: string; value: string; bonus: number; unit?: string }[] = [
    { icon: "❤️", label: "Vida máxima", hint: "Quanto dano você aguenta", value: String(s.hp.value), bonus: s.hp.bonus },
    { icon: "⚡", label: "Energia máxima", hint: "Gasta em caçadas e missões", value: String(s.energy.value), bonus: 0 },
    { icon: "⚔️", label: "Ataque físico", hint: "Dano do ataque básico", value: `${s.atk.range[0]}–${s.atk.range[1]}`, bonus: s.atk.bonus },
    { icon: "✨", label: "Poder mágico", hint: "Base das habilidades mágicas", value: `${s.magic.range[0]}–${s.magic.range[1]}`, bonus: s.magic.bonus },
    { icon: "🛡️", label: "Defesa", hint: "Reduz o dano recebido", value: String(s.def.value), bonus: s.def.bonus },
    { icon: "💨", label: "Esquiva", hint: "Contra inimigo de mesma agilidade", value: `${s.dodge.value}%`, bonus: s.dodge.bonus, unit: "%" },
    { icon: "🎯", label: "Chance de crítico", hint: "Crítico causa ×1,6 de dano", value: `${s.crit.value}%`, bonus: s.crit.bonus, unit: "%" },
  ];
  return (
    <Panel className="p-5">
      <h2 className="font-display text-lg text-gold">{t("Status de combate")}</h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-3 rounded-lg bg-black/30 px-3 py-2">
            <span className="text-xl" aria-hidden>{r.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">{t(r.label)}</p>
              <p className="text-[11px] text-white/40">{t(r.hint)}</p>
            </div>
            <span className="whitespace-nowrap text-right font-display text-lg">{r.value}{plus(r.bonus, r.unit)}</span>
          </li>
        ))}
      </ul>
      {s.weapon && (
        <p className="mt-3 text-[11px] text-white/50">
          🗡️ {t("Dano efetivo para você: {x} (escala com {a})", { x: s.weapon.total, a: t(ATTR_LABEL[s.weapon.attr]) })}
        </p>
      )}
      <p className="mt-1 text-[11px] text-white/50"><span className="text-emerald-400">(+N)</span> = {t("quanto vem dos equipamentos, conjuntos e pet")}</p>
    </Panel>
  );
}
