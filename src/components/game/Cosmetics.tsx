"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import type { GameCtx } from "./GameApp";
import { COSMETICS, skinFits, type Cosmetic, type CosmeticKind } from "@/lib/shop/catalog";
import { post, RARITY_LABEL, RARITY_STYLE } from "./api";
import Avatar from "./Avatar";
import { play } from "./sfx";
import { useT } from "@/lib/i18n/client";

type Data = { owned: string[]; equipped: Record<CosmeticKind, string | null> };
// Títulos têm painel próprio (Titles.tsx); aqui ficam só molduras e visuais.
const KINDS: [CosmeticKind, string][] = [["frame", "🖼️ Molduras"], ["skin", "🎭 Visuais do herói"]];

/** Coleção de cosméticos: tudo que o jogador ganhou ou comprou, para escolher o que usar. */
export default function Cosmetics({ ctx }: { ctx: GameCtx }) {
  const t = useT();
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const c = ctx.state.character;

  const load = useCallback(async () => {
    const r = await fetch("/api/cosmetics", { cache: "no-store" });
    if (r.ok) setD(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  async function equip(x: Cosmetic, on: boolean) {
    setBusy(true);
    try {
      await post("/api/shop/equip", { kind: x.kind, cosmeticId: on ? x.id : null });
      play("coin");
      ctx.toast(on ? t("Equipado!") : t("Removido"));
      await Promise.all([load(), ctx.refresh()]);
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (!d) return <p className="text-sm text-white/60">{t("Carregando...")}</p>;
  const fits = COSMETICS.filter((x) => x.kind !== "title" && skinFits(x, c.race, c.gender));
  const total = fits.filter((x) => d.owned.includes(x.id)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-white/70">{t("Sua coleção: {a} de {b} molduras e visuais.", { a: total, b: fits.length })}</p>
        <button onClick={() => ctx.openTitles?.()} className="min-h-10 rounded-md bg-gold/15 px-3 text-sm text-gold ring-1 ring-gold/30 hover:bg-gold/25">
          🏷️ {t("Títulos")}{c.title ? <span className="ml-1 text-amber-200/80">· « {t(c.title)} »</span> : null}
        </button>
      </div>
      {KINDS.map(([kind, label]) => {
        const list = fits.filter((x) => x.kind === kind)
          .sort((a, b) => Number(d.owned.includes(b.id)) - Number(d.owned.includes(a.id)));
        const mine = list.filter((x) => d.owned.includes(x.id)).length;
        return (
          <section key={kind}>
            <h3 className="mb-2 font-display text-lg text-gold">{t(label)} <span className="text-sm text-white/50">({mine}/{list.length})</span></h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {list.map((x) => {
                const owned = d.owned.includes(x.id);
                const on = d.equipped[kind] === x.id;
                return (
                  <div key={x.id} className={`panel relative p-3 text-center ring-1 ${owned ? RARITY_STYLE[x.rarity] : "opacity-50 ring-white/10"} ${on ? "!ring-2 !ring-emerald-400" : ""}`}>
                    {on && <span className="absolute right-2 top-2 rounded bg-emerald-600 px-1.5 text-[10px] font-bold">{t("EM USO")}</span>}
                    <div className="mx-auto grid h-20 place-items-center">
                      {kind === "frame" ? <Avatar src={c.portrait} frame={x.id} size={76} /> :
                        <Image src={x.image!} alt="" width={64} height={80} className={`h-20 w-16 rounded-lg object-cover ${owned ? "" : "grayscale"}`} />}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-tight">{owned ? "" : "🔒 "}{t(x.name)}</p>
                    <p className="text-[11px] text-white/40">{t(RARITY_LABEL[x.rarity])}</p>
                    {owned ? (
                      <button disabled={busy} onClick={() => equip(x, !on)}
                        className={`mt-2 w-full rounded-md py-1.5 text-xs ${on ? "bg-white/10" : "bg-emerald-600"}`}>
                        {on ? t("Remover") : t("Usar")}
                      </button>
                    ) : (
                      <p className="mt-2 text-[11px] leading-tight text-white/60">
                        {x.how ? t(x.how) : x.price ? `${t("Na Loja")} · ${x.price.currency === "gems" ? "💎" : "🪙"} ${x.price.amount}` : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
