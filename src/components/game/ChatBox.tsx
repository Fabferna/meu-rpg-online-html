"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameCtx } from "./GameApp";
import { COSMETIC_BY_ID } from "@/lib/shop/catalog";
import { post } from "./api";
import { useT } from "@/lib/i18n/client";
import { markGuildRead } from "./guildUnread";

export type ChatMsg = { id: number; channel: string; name: string; tag: string | null; title: string | null; frame: string | null; body: string; created_at: string; hidden?: boolean };

const realtimeEnabled = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Lista de mensagens + campo de envio. Tempo real via Supabase Realtime, com consulta periódica de reserva. */
export default function ChatBox({ channel, ctx, onIncoming, onName }: { channel: "global" | "guild" | `dm:${string}`; ctx: GameCtx; onIncoming?: (m: ChatMsg) => void; onName?: (name: string) => void }) {
  const t = useT();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState(false);
  const [reporting, setReporting] = useState<number | null>(null);
  const [reported, setReported] = useState<Set<number>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const lastId = useRef(0);
  const firstLoad = useRef(true);
  const [below, setBelow] = useState(0); // mensagens novas abaixo enquanto o jogador lê as antigas
  const guildId = ctx.state.guild?.id;
  const dbChannel = channel === "global" || channel.startsWith("dm:") ? channel : guildId ? `guild:${guildId}` : null;

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
    setMsgs([]); lastId.current = 0; firstLoad.current = true;
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

  // Abre sempre na ÚLTIMA mensagem. Depois, só desce sozinho se o jogador já estava no fim;
  // se estiver lendo mensagens antigas, mostra o aviso "↓ novas mensagens".
  const prevLen = useRef(0);
  useEffect(() => {
    const el = listRef.current;
    if (!el || !msgs.length) { prevLen.current = msgs.length; return; }
    const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (firstLoad.current || atEnd) {
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
      firstLoad.current = false;
      setBelow(0);
    } else if (msgs.length > prevLen.current) {
      setBelow((n) => n + (msgs.length - prevLen.current));
    }
    prevLen.current = msgs.length;
    if (channel === "guild" && guildId) markGuildRead(guildId, msgs[msgs.length - 1].id);
  }, [msgs, channel, guildId]);
  const toEnd = () => { const el = listRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); setBelow(0); };

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await post("/api/chat", { channel, body });
      setText("");
      firstLoad.current = true; // a própria mensagem: desce até ela
      if (!live) await poll();
    } catch (err) {
      ctx.toast((err as Error).message, "error");
    } finally {
      setSending(false);
    }
  }

  async function report(id: number, reason: string) {
    setReporting(null);
    try {
      const r = await post<{ hidden: boolean }>("/api/chat/report", { messageId: id, reason });
      setReported((s) => new Set(s).add(id));
      if (r.hidden) setMsgs((cur) => cur.filter((m) => m.id !== id));
      ctx.toast("Denúncia enviada. Obrigado por ajudar a manter o chat saudável!");
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    }
  }

  if (channel === "guild" && !guildId) return <p className="p-4 text-sm text-white/60">{t("Entre em uma guilda para usar este chat.")}</p>;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={listRef} onScroll={(e) => { const el = e.currentTarget; if (below && el.scrollHeight - el.scrollTop - el.clientHeight < 40) setBelow(0); }}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" aria-live="polite">
        {msgs.length === 0 && <p className="py-8 text-center text-sm text-white/40">{t("Nenhuma mensagem ainda. Diga olá!")}</p>}
        {msgs.map((m) => {
          const mine = m.name === ctx.state.character.name;
          const title = m.title ? COSMETIC_BY_ID[m.title]?.name : null;
          return (
            <div key={m.id} className={`group relative rounded-lg px-3 py-1.5 text-sm ${mine ? "bg-gold/10" : "bg-black/30"} ${m.hidden ? "opacity-50" : ""}`}>
              {!mine && !reported.has(m.id) && (
                <button onClick={() => setReporting(reporting === m.id ? null : m.id)} title={t("Denunciar mensagem")} aria-label={t("Denunciar mensagem")}
                  className="absolute right-1.5 top-1 rounded px-1 text-xs text-white/30 opacity-60 hover:bg-white/10 hover:text-red-300 group-hover:opacity-100">⚑</button>
              )}
              <p className="text-[11px] text-white/50">
                {m.tag && <span className="mr-1 rounded bg-white/10 px-1 font-semibold text-gold">[{m.tag}]</span>}
                <button type="button" onClick={() => onName?.(m.name)} className={`font-bold hover:underline ${mine ? "text-gold" : "text-white/90"}`}>{m.name}</button>
                {title && <span className="ml-1 text-amber-200/70">« {title} »</span>}
                <span className="ml-1">· {new Date(m.created_at).toLocaleTimeString(t.locale, { hour: "2-digit", minute: "2-digit" })}</span>
              </p>
              <p className="break-words pr-5">{m.body}{m.hidden && <span className="ml-1 text-[10px] text-red-300">{t("(oculta por denúncias)")}</span>}</p>
              {reporting === m.id && (
                <div className="mt-1.5 flex flex-wrap gap-1 text-[11px]">
                  <span className="text-white/50">{t("Motivo:")}</span>
                  {(["ofensa", "spam", "golpe", "outro"] as const).map((r) => (
                    <button key={r} onClick={() => report(m.id, r)} className="rounded bg-red-900/50 px-2 py-0.5 capitalize hover:bg-red-800/70">{r}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {below > 0 && (
        <button type="button" onClick={toEnd} className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2 rounded-full bg-ember px-3 py-1 text-xs font-bold shadow-lg">
          ↓ {t("{n} mensagem(ns) nova(s)", { n: below })}
        </button>
      )}
      <form onSubmit={send} className="mt-2 flex gap-2">
        <input id={`chat-input-${channel}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder={t("Escreva uma mensagem…")} autoComplete="off"
          className="input min-w-0 flex-1 !py-2 text-sm" aria-label={t("Mensagem")} />
        <button className="btn-gold !px-3 !py-2 text-sm" disabled={sending || !text.trim()}>{t("Enviar")}</button>
      </form>
      <p className="mt-1 text-[10px] text-white/30">{live ? t("● ao vivo") : t("atualiza a cada poucos segundos")} · {t("seja gentil: ofensas são censuradas e links bloqueados.")}</p>
    </div>
  );
}
