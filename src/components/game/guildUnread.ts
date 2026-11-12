"use client";
// Mensagens novas no chat da guilda: guarda (no navegador) a última mensagem lida e avisa quem
// estiver ouvindo (bolinha na aba Guilda, no botão do chat e na aba 🏰 do chat).
import { useEffect, useState } from "react";

type Snap = { count: number };
let snap: Snap = { count: 0 };
const subs = new Set<(s: Snap) => void>();
const emit = (s: Snap) => { snap = s; subs.forEach((f) => f(s)); };

const key = (guildId: string) => `aeth:guild-read:${guildId}`;
function readId(guildId: string) {
  try { return Number(localStorage.getItem(key(guildId)) ?? 0) || 0; } catch { return 0; }
}
function saveId(guildId: string, id: number) {
  try { localStorage.setItem(key(guildId), String(id)); } catch { /* sem armazenamento: só não lembra */ }
}

/** O chat da guilda está na tela e mostrou até a mensagem `id`: tudo até ela está lido. */
export function markGuildRead(guildId: string, id: number) {
  if (id > readId(guildId)) saveId(guildId, id);
  if (snap.count) emit({ count: 0 });
}

/** Consulta periódica das mensagens novas da guilda (só de outros jogadores). */
async function check(guildId: string, me: string) {
  let last = readId(guildId);
  if (!last) {
    // 1ª vez neste aparelho: começa a contar a partir de agora (não acusa o histórico inteiro).
    const r = await fetch("/api/chat?channel=guild&peek=1", { cache: "no-store" });
    const id = r.ok ? ((await r.json()).messages?.[0]?.id ?? 0) : 0;
    saveId(guildId, id || 1);
    return;
  }
  const r = await fetch(`/api/chat?channel=guild&after=${last}`, { cache: "no-store" });
  if (!r.ok) return;
  const msgs: { id: number; name: string }[] = (await r.json()).messages ?? [];
  last = readId(guildId); // pode ter sido lido enquanto a consulta andava
  const count = msgs.filter((m) => m.id > last && m.name !== me).length;
  if (count !== snap.count) emit({ count });
}

/** Quantas mensagens novas há no chat da guilda. Quem chama com `poll` faz a consulta (só o GameApp). */
export function useGuildUnread(guildId: string | undefined, me: string, poll = false) {
  const [s, setS] = useState(snap);
  useEffect(() => { subs.add(setS); return () => { subs.delete(setS); }; }, []);
  useEffect(() => {
    if (!poll || !guildId) { if (poll && snap.count) emit({ count: 0 }); return; }
    check(guildId, me).catch(() => {});
    const i = setInterval(() => { if (document.visibilityState === "visible") check(guildId, me).catch(() => {}); }, 15_000);
    return () => clearInterval(i);
  }, [guildId, me, poll]);
  return s.count;
}
