"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import ChatBox, { type ChatMsg } from "./ChatBox";
import ProfileCard from "./ProfileCard";
import Avatar from "./Avatar";
import { post } from "./api";
import { useGuildUnread } from "./guildUnread";
import { useT } from "@/lib/i18n/client";

type Friend = { name: string; level: number; raceName: string; portrait: string; frame: string | null; online: boolean; channel: `dm:${string}` };
type Friends = { friends: Friend[]; incoming: Friend[]; outgoing: Friend[] };

/** Botão flutuante 💬 com chat Global / Guilda / Amigos (com conversa privada e perfis). */
export default function ChatDock({ ctx, hideFabOnMobile = false }: { ctx: GameCtx; hideFabOnMobile?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"global" | "guild" | "friends">("global");
  const [dm, setDm] = useState<Friend | null>(null);
  const [profile, setProfile] = useState<string | null>(null);
  const [fr, setFr] = useState<Friends | null>(null);
  const [addName, setAddName] = useState("");
  const [unread, setUnread] = useState(0);
  const onIncoming = useCallback((m: ChatMsg) => {
    if (!open && m.name !== ctx.state.character.name) setUnread((n) => n + 1);
  }, [open, ctx.state.character.name]);

  const loadFriends = useCallback(() => fetch("/api/friends", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => d && Array.isArray(d.friends) && setFr(d)).catch(() => {}), []);
  useEffect(() => { loadFriends(); const i = setInterval(loadFriends, 60_000); return () => clearInterval(i); }, [loadFriends]);
  useEffect(() => { if (open && tab === "friends") loadFriends(); }, [open, tab, loadFriends]);

  async function act(op: "add" | "accept" | "decline" | "remove", name: string) {
    try {
      const r = await post<{ result?: string }>("/api/friends", { op, name });
      if (op === "add") { setAddName(""); ctx.toast(r.result === "accepted" ? t("Vocês agora são amigos!") : t("Pedido de amizade enviado."), "reward"); }
      await loadFriends();
    } catch (e) { ctx.toast((e as Error).message, "error"); }
  }
  const openDm = (name: string) => {
    const f = fr?.friends.find((x) => x.name === name);
    if (f) { setDm(f); setTab("friends"); setOpen(true); setProfile(null); }
  };
  const pending = fr?.incoming.length ?? 0;
  const guildNew = useGuildUnread(ctx.state.guild?.id, ctx.state.character.name);

  return (
    <>
      <button onClick={() => { setOpen(!open); setUnread(0); }} aria-label={t("Abrir chat")}
        className={`fixed bottom-3 right-3 z-40 h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-arcane to-fuchsia-700 text-xl sm:bottom-4 sm:left-4 sm:right-auto sm:grid sm:h-14 sm:w-14 sm:text-2xl shadow-xl ring-2 ring-white/10 transition hover:scale-105 ${open ? "hidden sm:grid" : hideFabOnMobile ? "hidden" : "grid"}`}
        data-fab="chat"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
        💬
        {unread + pending + guildNew > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ember px-1 text-xs font-bold">{unread + pending + guildNew > 9 ? "9+" : unread + pending + guildNew}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="panel fixed inset-x-2 bottom-2 z-50 flex h-[min(560px,82dvh)] flex-col !bg-panel p-3 shadow-2xl sm:inset-x-auto sm:bottom-20 sm:left-4 sm:h-[min(520px,70dvh)] sm:w-96" role="dialog" aria-label={t("Chat")}>
            <div className="mb-2 flex items-center gap-1.5">
              {(["global", "guild", "friends"] as const).map((k) => (
                <button key={k} onClick={() => { setTab(k); setDm(null); }} className={`relative rounded-md px-2.5 py-1 text-xs font-display ${tab === k ? "bg-gold text-ink" : "bg-white/5 text-white/70"}`}>
                  {k === "global" ? `🌍 ${t("Global")}` : k === "guild" ? `🏰 ${t("Guilda")}` : `👥 ${t("Amigos")}`}
                  {k === "guild" && guildNew > 0 && tab !== "guild" && <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-ember px-1 text-[10px] font-bold text-white">{guildNew > 9 ? "9+" : guildNew}</span>}
                  {k === "friends" && pending > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-ember" />}
                </button>
              ))}
              <button onClick={() => setOpen(false)} aria-label={t("Fechar chat")} className="ml-auto px-2 text-white/50 hover:text-white">✕</button>
            </div>

            {tab !== "friends" ? <ChatBox key={tab} channel={tab} ctx={ctx} onName={setProfile} /> : dm ? (
              <>
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-black/30 px-2 py-1.5">
                  <button onClick={() => setDm(null)} className="px-1 text-white/60 hover:text-white" aria-label={t("Voltar")}>←</button>
                  <Avatar src={dm.portrait} frame={dm.frame} size={28} />
                  <button onClick={() => setProfile(dm.name)} className="font-display text-sm hover:underline">{dm.name}</button>
                  <span className={`h-2 w-2 rounded-full ${dm.online ? "bg-emerald-400" : "bg-white/20"}`} />
                </div>
                <ChatBox key={dm.channel} channel={dm.channel} ctx={ctx} onName={setProfile} />
              </>
            ) : (
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto text-sm">
                <form onSubmit={(e) => { e.preventDefault(); if (addName.trim()) act("add", addName.trim()); }} className="flex gap-2">
                  <input value={addName} onChange={(e) => setAddName(e.target.value)} maxLength={16} placeholder={t("Nome do herói")} className="input min-w-0 flex-1 !py-2 text-sm" aria-label={t("Nome do herói")} />
                  <button className="btn-gold !px-3 !py-2 text-xs">➕ {t("Adicionar")}</button>
                </form>
                {!!fr?.incoming.length && (
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wider text-amber-300">{t("Pedidos recebidos")}</p>
                    {fr.incoming.map((f) => (
                      <div key={f.name} className="flex items-center gap-2 rounded-lg bg-black/30 p-2">
                        <Avatar src={f.portrait} frame={f.frame} size={32} />
                        <button onClick={() => setProfile(f.name)} className="flex-1 truncate text-left font-display hover:underline">{f.name}</button>
                        <button onClick={() => act("accept", f.name)} className="rounded bg-emerald-600/70 px-2 py-1 text-xs" aria-label={t("Aceitar amizade")}>✔</button>
                        <button onClick={() => act("decline", f.name)} className="rounded bg-white/10 px-2 py-1 text-xs" aria-label={t("Recusar")}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-white/40">{t("Amigos")} ({fr?.friends.length ?? 0})</p>
                  {!fr?.friends.length && <p className="py-4 text-center text-xs text-white/40">{t("Adicione amigos pelo nome do herói ou tocando no nome de alguém no chat.")}</p>}
                  {[...(fr?.friends ?? [])].sort((a, b) => Number(b.online) - Number(a.online)).map((f) => (
                    <div key={f.name} className="mb-1 flex items-center gap-2 rounded-lg bg-black/30 p-2">
                      <Avatar src={f.portrait} frame={f.frame} size={32} />
                      <button onClick={() => setProfile(f.name)} className="min-w-0 flex-1 text-left">
                        <p className="truncate font-display hover:underline">{f.name} <span className={`ml-1 inline-block h-2 w-2 rounded-full ${f.online ? "bg-emerald-400" : "bg-white/20"}`} /></p>
                        <p className="text-[11px] text-white/50">{t(f.raceName)} · {t("Nv.")} {f.level}</p>
                      </button>
                      <button onClick={() => setDm(f)} className="rounded bg-arcane/60 px-2 py-1 text-xs" title={t("Mensagem")} aria-label={t("Mensagem")}>💬</button>
                    </div>
                  ))}
                </div>
                {!!fr?.outgoing.length && (
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wider text-white/40">{t("Pedidos enviados")}</p>
                    {fr.outgoing.map((f) => (
                      <div key={f.name} className="flex items-center gap-2 rounded-lg bg-black/20 p-2 text-white/60">
                        <span className="flex-1 truncate">{f.name}</span>
                        <button onClick={() => act("decline", f.name)} className="text-xs hover:text-white">{t("Cancelar")}</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {!open && <div className="hidden"><ChatBox channel="global" ctx={ctx} onIncoming={onIncoming} /></div>}
      <ProfileCard name={profile} onClose={() => setProfile(null)} onMessage={openDm} onError={(m) => ctx.toast(m, "error")} />
    </>
  );
}
