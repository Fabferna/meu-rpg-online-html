"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import { PETS, PET_MAX_LEVEL, petBonus, petTrainCost } from "@/lib/game/pets";
import { post, RARITY_LABEL, RARITY_STYLE } from "./api";
import { Panel } from "./ui";
import { play } from "./sfx";

const LABEL: Record<string, string> = { atk: "ATQ", def: "DEF", str: "FOR", dex: "DES", con: "CON", intel: "INT" };
const txt = (b: Record<string, number>) => Object.entries(b).map(([k, v]) => `${LABEL[k]} +${v}`).join(" · ");

export default function Pets({ ctx }: { ctx: GameCtx }) {
  const [owned, setOwned] = useState<{ pet_id: string; level: number; active: boolean }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch("/api/pets", { cache: "no-store" });
    if (r.ok) setOwned((await r.json()).pets);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function run(body: object, ok: string) {
    setBusy(true);
    try {
      await post("/api/pets/action", body);
      play("coin"); ctx.toast(ok);
      await Promise.all([load(), ctx.refresh()]);
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (!owned) return <p className="text-white/50">Carregando pets…</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-white/60">Um pet ativo acompanha você e soma atributos em caçadas, masmorras, Arena e no chefe da guilda.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PETS.map((p) => {
          const o = owned.find((x) => x.pet_id === p.id);
          const lvl = o?.level ?? 1;
          return (
            <motion.div key={p.id} whileHover={{ y: -3 }} className={`panel flex flex-col p-4 ring-1 ${RARITY_STYLE[p.rarity]} ${o?.active ? "!ring-2 !ring-emerald-400" : ""}`}>
              <div className="relative mx-auto h-28 w-28">
                <Image src={p.image} alt={p.name} fill sizes="112px" className={`rounded-xl object-cover ${o ? "" : "grayscale-[60%]"}`} />
                {o && <span className="absolute -right-2 -top-2 rounded-full bg-gold px-2 font-display text-sm font-black text-ink">Nv {lvl}</span>}
                {o?.active && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-2 text-[10px] font-bold text-ink">ATIVO</span>}
              </div>
              <p className="mt-3 text-center font-display">{p.name}</p>
              <p className="text-center text-[11px] text-white/40">{RARITY_LABEL[p.rarity]}</p>
              <p className="mt-1 flex-1 text-center text-xs text-white/70">{p.description}</p>
              <p className="mt-2 text-center text-[11px] text-emerald-300">{txt(petBonus(p.id, lvl))}{o && lvl < PET_MAX_LEVEL ? <span className="text-white/40"> → {txt(petBonus(p.id, lvl + 1))}</span> : null}</p>
              <div className="mt-3 space-y-1.5">
                {!o ? (
                  p.price
                    ? <button className="btn-gold w-full !py-2 text-sm" disabled={busy} onClick={() => run({ type: "buy", petId: p.id }, `🐾 ${p.name} agora é seu!`)}>
                        {p.price.currency === "gems" ? "💎" : "🪙"} {p.price.amount.toLocaleString("pt-BR")}
                      </button>
                    : <p className="rounded-md bg-fuchsia-900/40 py-2 text-center text-xs">👑 Exclusivo do Passe Premium</p>
                ) : (
                  <>
                    <button className={`w-full rounded-md py-1.5 text-xs ${o.active ? "bg-white/10" : "bg-emerald-600"}`} disabled={busy}
                      onClick={() => run(o.active ? { type: "dismiss" } : { type: "activate", petId: p.id }, o.active ? "Pet guardado." : `${p.name} está com você!`)}>
                      {o.active ? "Guardar" : "Levar comigo"}
                    </button>
                    {lvl < PET_MAX_LEVEL
                      ? <button className="w-full rounded-md bg-gradient-to-r from-ember/70 to-amber-600/70 py-1.5 text-xs" disabled={busy || ctx.state.wallet.gold < petTrainCost(lvl)}
                          onClick={() => run({ type: "train", petId: p.id }, `${p.name} subiu para o nível ${lvl + 1}!`)}>🍖 Treinar · 🪙 {petTrainCost(lvl).toLocaleString("pt-BR")}</button>
                      : <p className="text-center text-xs text-gold">Nível máximo</p>}
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
