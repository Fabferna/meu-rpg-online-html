"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GameCtx } from "./GameApp";
import ChatBox, { type ChatMsg } from "./ChatBox";

/** Botão flutuante 💬 com chat Global / Guilda. */
export default function ChatDock({ ctx }: { ctx: GameCtx }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"global" | "guild">("global");
  const [unread, setUnread] = useState(0);
  const onIncoming = useCallback((m: ChatMsg) => {
    if (!open && m.name !== ctx.state.character.name) setUnread((n) => n + 1);
  }, [open, ctx.state.character.name]);

  return (
    <>
      <button onClick={() => { setOpen(!open); setUnread(0); }} aria-label="Abrir chat"
        className="fixed bottom-4 left-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-arcane to-fuchsia-700 text-2xl shadow-xl ring-2 ring-white/10 transition hover:scale-105"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
        💬
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ember px-1 text-xs font-bold">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {/* Mantém o chat montado (recebendo mensagens) mesmo fechado, para contar não lidas. */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="panel fixed bottom-20 left-4 right-4 z-40 flex !bg-panel shadow-2xl h-[min(520px,70dvh)] flex-col p-3 sm:right-auto sm:w-96">
            <div className="mb-2 flex items-center gap-2">
              {(["global", "guild"] as const).map((k) => (
                <button key={k} onClick={() => setTab(k)} className={`rounded-md px-3 py-1 text-xs font-display ${tab === k ? "bg-gold text-ink" : "bg-white/5 text-white/70"}`}>
                  {k === "global" ? "🌍 Global" : `🏰 Guilda${ctx.state.guild ? ` [${ctx.state.guild.tag}]` : ""}`}
                </button>
              ))}
              <button onClick={() => setOpen(false)} aria-label="Fechar chat" className="ml-auto px-2 text-white/50 hover:text-white">✕</button>
            </div>
            <ChatBox key={tab} channel={tab} ctx={ctx} />
          </motion.div>
        )}
      </AnimatePresence>
      {!open && <div className="hidden"><ChatBox channel="global" ctx={ctx} onIncoming={onIncoming} /></div>}
    </>
  );
}
