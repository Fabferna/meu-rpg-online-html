"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import Avatar from "./Avatar";
import { post } from "./api";
import { ITEM_BY_ID } from "@/lib/game/items";
import { PET_BY_ID } from "@/lib/game/pets";
import { CHAPTERS } from "@/lib/game/story";
import { useT } from "@/lib/i18n/client";

type Profile = {
  name: string; level: number; raceName: string; portrait: string; frame: string | null; title: string | null; online: boolean;
  pvpRating: number; pvpWins: number; pvpLosses: number; pveWins: number; storyChapter: number; bossesSlain: number; questsDone: number;
  gear: { item_id: string; slot: string; upgrade: number }[]; pet: { pet_id: string; level: number } | null;
  guild: { name: string; tag: string; role: string } | null; me: boolean; friend: "none" | "sent" | "received" | "friends";
};

/** Janela com o perfil público de um herói (usada no chat, amigos e ranking). */
export default function ProfileCard({ name, onClose, onMessage, onError }: { name: string | null; onClose: () => void; onMessage?: (name: string) => void; onError?: (m: string) => void }) {
  const t = useT();
  const [p, setP] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setP(null);
    if (name) fetch(`/api/profile?name=${encodeURIComponent(name)}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then(setP).catch(() => {});
  }, [name]);

  async function friend(op: "add" | "accept" | "remove") {
    if (!p) return;
    setBusy(true);
    try {
      await post("/api/friends", { op, name: p.name });
      const r = await fetch(`/api/profile?name=${encodeURIComponent(p.name)}`, { cache: "no-store" });
      if (r.ok) setP(await r.json());
    } catch (e) { onError?.((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <AnimatePresence>
      {name && (
        <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="panel w-full max-w-md p-5" role="dialog" aria-modal="true">
            {!p ? <p className="py-10 text-center text-white/50">{t("Carregando…")}</p> : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar src={p.portrait} frame={p.frame} size={72} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-xl text-gold">{p.name} <span className={`ml-1 inline-block h-2.5 w-2.5 rounded-full ${p.online ? "bg-emerald-400" : "bg-white/20"}`} title={p.online ? t("Online") : t("Offline")} /></p>
                    {p.title && <p className="text-xs text-amber-200/80">« {t(p.title)} »</p>}
                    <p className="text-sm text-white/70">{t(p.raceName)} · {t("Nível {n}", { n: p.level })}</p>
                    {p.guild && <p className="text-xs text-white/60">🏰 [{p.guild.tag}] {p.guild.name}</p>}
                  </div>
                  <button onClick={onClose} aria-label={t("Fechar")} className="self-start px-2 text-white/50 hover:text-white">✕</button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {[[t("Rating PVP"), p.pvpRating], [t("V/D"), `${p.pvpWins}/${p.pvpLosses}`], [t("Vitórias PVE"), p.pveWins],
                    [t("História"), `${p.storyChapter}/${CHAPTERS.length}`], [t("Chefes"), p.bossesSlain], [t("Missões"), p.questsDone]].map(([l, v]) => (
                    <div key={String(l)} className="rounded-lg bg-black/30 py-2"><p className="font-display text-lg text-gold">{v}</p><p className="text-white/50">{l}</p></div>
                  ))}
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-white/40">{t("Equipamentos")}</p>
                  <div className="flex flex-wrap gap-2">
                    {p.gear.length === 0 && <span className="text-xs text-white/40">—</span>}
                    {p.gear.map((g) => { const it = ITEM_BY_ID[g.item_id]; return it ? (
                      <div key={g.slot} title={`${t(it.name)}${g.upgrade ? ` +${g.upgrade}` : ""}`} className="relative h-12 w-12 rounded-lg bg-black/40 p-1">
                        <Image src={it.image} alt={t(it.name)} fill sizes="48px" className="object-contain p-1" />
                        {g.upgrade > 0 && <span className="absolute -right-1 -top-1 rounded bg-gold px-1 text-[10px] font-bold text-ink">+{g.upgrade}</span>}
                      </div>) : null; })}
                    {p.pet && PET_BY_ID[p.pet.pet_id] && (
                      <div title={`${t(PET_BY_ID[p.pet.pet_id].name)} · ${t("Nv.")} ${p.pet.level}`} className="relative h-12 w-12 rounded-lg bg-black/40">
                        <Image src={PET_BY_ID[p.pet.pet_id].image} alt="" fill sizes="48px" className="rounded-lg object-cover" />
                      </div>
                    )}
                  </div>
                </div>
                {!p.me && (
                  <div className="flex flex-wrap gap-2">
                    {p.friend === "none" && <button disabled={busy} onClick={() => friend("add")} className="btn-gold !py-2 text-sm">➕ {t("Adicionar amigo")}</button>}
                    {p.friend === "sent" && <span className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white/60">⏳ {t("Pedido enviado")}</span>}
                    {p.friend === "received" && <button disabled={busy} onClick={() => friend("accept")} className="btn-gold !py-2 text-sm">✔ {t("Aceitar amizade")}</button>}
                    {p.friend === "friends" && onMessage && <button onClick={() => onMessage(p.name)} className="btn-gold !py-2 text-sm">💬 {t("Mensagem")}</button>}
                    {p.friend === "friends" && <button disabled={busy} onClick={() => friend("remove")} className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white/60 hover:bg-red-900/40">{t("Remover amigo")}</button>}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
