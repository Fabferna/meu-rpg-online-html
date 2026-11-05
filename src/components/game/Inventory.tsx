"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import { post, RARITY_LABEL, RARITY_STYLE } from "./api";
import { Panel } from "./ui";

const SLOT_LABEL: Record<string, string> = { weapon: "Arma", armor: "Armadura", accessory: "Acessório" };
const STAT_LABEL: Record<string, string> = { atk: "ATQ", def: "DEF", str: "FOR", dex: "DES", con: "CON", intel: "INT", heal: "Cura" };

export default function Inventory({ ctx }: { ctx: GameCtx }) {
  const [busy, setBusy] = useState(false);
  const items = ctx.state.inventory;

  async function toggle(id: string) {
    setBusy(true);
    try {
      const r = await post<{ equipped: boolean }>("/api/inventory/equip", { inventoryId: id });
      ctx.toast(r.equipped ? "Item equipado" : "Item removido");
      await ctx.refresh();
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const equipped = items.filter((i) => i.equipped);

  return (
    <div className="space-y-5">
      <Panel className="grid grid-cols-3 gap-3 p-4">
        {["weapon", "armor", "accessory"].map((slot) => {
          const it = equipped.find((i) => i.slot === slot);
          return (
            <div key={slot} className={`flex flex-col items-center rounded-lg bg-black/30 p-3 ring-1 ${it ? RARITY_STYLE[it.rarity] : "ring-white/10"}`}>
              <p className="text-[11px] uppercase tracking-wider text-white/40">{SLOT_LABEL[slot]}</p>
              <div className="relative mt-2 h-16 w-16">
                {it ? <Image src={String(it.data.image)} alt="" fill sizes="64px" className="object-contain" /> : <span className="grid h-full place-items-center text-2xl text-white/20">＋</span>}
              </div>
              <p className="mt-2 text-center text-xs">{it?.name ?? "Vazio"}</p>
            </div>
          );
        })}
      </Panel>

      {items.length === 0 ? (
        <Panel className="p-8 text-center text-white/60">Sua bolsa está vazia. Complete missões e caçadas para encontrar itens!</Panel>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((it, i) => (
            <motion.div key={it.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
              className={`panel p-3 ring-1 ${RARITY_STYLE[it.rarity]}`}>
              <div className="relative mx-auto h-20 w-20">
                <Image src={String(it.data.image)} alt="" fill sizes="80px" className="object-contain" />
                {it.qty > 1 && <span className="absolute -right-1 -top-1 rounded-full bg-gold px-1.5 text-xs font-bold text-ink">x{it.qty}</span>}
              </div>
              <p className="mt-2 truncate text-center text-sm">{it.name}</p>
              <p className="text-center text-[11px] text-white/40">{RARITY_LABEL[it.rarity]}</p>
              <p className="mt-1 text-center text-[11px] text-emerald-300">
                {Object.entries(it.data).filter(([k]) => k in STAT_LABEL).map(([k, v]) => `${STAT_LABEL[k]} +${v}`).join(" · ")}
              </p>
              {it.slot && (
                <button disabled={busy} onClick={() => toggle(it.id)}
                  className={`mt-2 w-full rounded-md py-1.5 text-xs ${it.equipped ? "bg-white/10" : "bg-gold/90 text-ink"}`}>
                  {it.equipped ? "Remover" : "Equipar"}
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
