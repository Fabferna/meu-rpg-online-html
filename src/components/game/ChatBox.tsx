"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameCtx } from "./GameApp";
import { COSMETIC_BY_ID } from "@/lib/shop/catalog";
import { post } from "./api";

export type ChatMsg = { id: number; channel: string; name: string; tag: string | null; title: string | null; frame: string | null; body: string; created_at: string };

const realtimeEnabled = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Lista de mensagens + campo de envio. Tempo real via Supabase Realtime, com consulta periódica de reserva. */
export default function ChatBox({ channel, ctx, onIncoming }: { channel: "global" | "guild"; ctx: GameCtx; onIncoming?: (m: ChatMsg) => void }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const lastId = useRef(0);
  const guildId = ctx.state.guild?.id;
  const dbChannel = channel === "global" ? "global" : guildId ? `guild:${guildId}` : null;

  const add = useCallback((incoming: ChatMsg[], notify = false) => {
    if (!incoming.length) return;
    setMsgs((cur) => {
      const seen = new Set(cur.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      if (notify) fresh.forEach((m) => onIncoming?.(m));
      return [...cur, ...fresh].sort((a, b) => a.id - b.id).slice(-100);
    });
    lastId.current = Math.max(lastId.current, ...incoming.map((m) => m.id));
  }, [onIncoming]);

  const poll = useCallback(async () => {
    const r = await fetch(`/api/chat?channel=${channel}${lastId.current ? `&after=${lastId.current}` : ""}`, { cache: "no-store" });
    if (r.ok) add((await r.json()).messages ?? [], lastId.current > 0);
  }, [channel, add]);

  // Carga inicial + consulta de reserva (mais espaçada quando o tempo real está ligado).
  useEffect(() => {
    setMsgs([]); lastId.current = 0;
    poll();
    const t = setInterval(poll, live ? 60_000 : 8_000);
    return () => clearInterval(t);
  }, [poll, live]);

  // Tempo real.
  useEffect(() => {
    if (!realtimeEnabled || !dbChannel) return;
    let cleanup = () => {};
    import("@/lib/supabase/client").then(({ createClient }) => {
      const sb = createClient();
      const sub = sb
        .channel(`chat-${dbChannel}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel=eq.${dbChannel}` },
          (payload) => add([payload.new as ChatMsg], true))
        .subscribe((status) => setLive(status === "SUBSCRIBED"));
      cleanup = () => { sb.removeChannel(sub); };
    });
    return () => cleanup();
  }, [dbChannel, add]);

  // Rola para o fim quando chegam mensagens (se o jogador já estava no fim).
  useEffect(() => {
    const el = listRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 120) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await post("/api/chat", { channel, body });
      setText("");
      if (!live) await poll();
    } catch (err) {
      ctx.toast((err as Error).message, "error");
    } finally {
      setSending(false);
    }
  }

  if (channel === "guild" && !guildId) return <p className="p-4 text-sm text-white/60">Entre em uma guilda para usar este chat.</p>;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" aria-live="polite">
        {msgs.length === 0 && <p className="py-8 text-center text-sm text-white/40">Nenhuma mensagem ainda. Diga olá!</p>}
        {msgs.map((m) => {
          const mine = m.name === ctx.state.character.name;
          const title = m.title ? COSMETIC_BY_ID[m.title]?.name : null;
          return (
            <div key={m.id} className={`rounded-lg px-3 py-1.5 text-sm ${mine ? "bg-gold/10" : "bg-black/30"}`}>
              <p className="text-[11px] text-white/50">
                {m.tag && <span className="mr-1 rounded bg-white/10 px-1 font-semibold text-gold">[{m.tag}]</span>}
                <b className={mine ? "text-gold" : "text-white/90"}>{m.name}</b>
                {title && <span className="ml-1 text-amber-200/70">« {title} »</span>}
                <span className="ml-1">· {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
              </p>
              <p className="break-words">{m.body}</p>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="mt-2 flex gap-2">
        <input id={`chat-input-${channel}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="Escreva uma mensagem…" autoComplete="off"
          className="input min-w-0 flex-1 !py-2 text-sm" aria-label="Mensagem" />
        <button className="btn-gold !px-3 !py-2 text-sm" disabled={sending || !text.trim()}>Enviar</button>
      </form>
      <p className="mt-1 text-[10px] text-white/30">{live ? "● ao vivo" : "atualiza a cada poucos segundos"} · seja gentil: ofensas são censuradas e links bloqueados.</p>
    </div>
  );
}
