"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Report = { id: number; name: string; body: string; channel: string; hidden: boolean; created_at: string; count: number; reasons: string[] };
type Player = { name: string; banned: boolean; mutedUntil: string | null };

export default function AdminPanel({ reports, players }: { reports: Report[]; players: Player[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [target, setTarget] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [busy, setBusy] = useState(false);

  async function run(body: object, ok: string) {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/admin/moderate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? ok : `Erro: ${data.error ?? res.status}`);
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-gold">🛡️ Moderação</h1>
        <Link href="/jogo" className="text-sm underline">Voltar ao jogo</Link>
      </div>
      {msg && <p role="status" className="rounded-lg bg-white/10 px-4 py-2 text-sm">{msg}</p>}

      <section className="panel space-y-3 p-5">
        <h2 className="font-display text-lg text-gold">Ação sobre jogador</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">Herói<input id="adm-target" className="input mt-1 !w-48" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
          <label className="text-sm">Minutos (silenciar)<input id="adm-min" type="number" min={1} className="input mt-1 !w-28" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label>
          <button disabled={busy || !target} onClick={() => run({ action: "mute", target, minutes }, `${target} silenciado por ${minutes} min.`)} className="rounded-md bg-amber-700 px-3 py-2 text-sm">Silenciar</button>
          <button disabled={busy || !target} onClick={() => run({ action: "unmute", target }, `${target} pode falar de novo.`)} className="rounded-md bg-white/10 px-3 py-2 text-sm">Tirar silêncio</button>
          <button disabled={busy || !target} onClick={() => run({ action: "ban", target }, `${target} banido.`)} className="rounded-md bg-red-800 px-3 py-2 text-sm">Banir</button>
          <button disabled={busy || !target} onClick={() => run({ action: "unban", target }, `${target} desbanido.`)} className="rounded-md bg-white/10 px-3 py-2 text-sm">Desbanir</button>
        </div>
        <p className="text-xs text-white/50">Banir oculta as mensagens dos últimos 3 dias e bloqueia o chat. Para bloquear o login também, use Authentication → Users no Supabase.</p>
      </section>

      <section className="panel p-5">
        <h2 className="mb-3 font-display text-lg text-gold">Denúncias abertas ({reports.length})</h2>
        {reports.length === 0 ? <p className="text-sm text-white/50">Nenhuma denúncia pendente. 🎉</p> : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-lg bg-black/30 p-3 text-sm">
                <p className="text-xs text-white/50">
                  <b className="text-white">{r.name}</b> · {r.channel === "global" ? "Global" : "Guilda"} · {new Date(r.created_at).toLocaleString("pt-BR")} ·
                  <span className="text-red-300"> {r.count} denúncia(s): {r.reasons.join(", ")}</span>{r.hidden && " · já oculta"}
                </p>
                <p className="my-1.5 break-words">{r.body}</p>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {r.hidden
                    ? <button disabled={busy} onClick={() => run({ action: "restore", messageId: r.id }, "Mensagem restaurada.")} className="rounded bg-white/10 px-2 py-1">Restaurar</button>
                    : <button disabled={busy} onClick={() => run({ action: "hide", messageId: r.id }, "Mensagem ocultada.")} className="rounded bg-amber-700 px-2 py-1">Ocultar</button>}
                  <button disabled={busy} onClick={() => run({ action: "mute", target: r.name, minutes: 60, messageId: r.id }, `${r.name} silenciado por 1h.`)} className="rounded bg-amber-800 px-2 py-1">Silenciar autor 1h</button>
                  <button disabled={busy} onClick={() => run({ action: "ban", target: r.name, messageId: r.id }, `${r.name} banido.`)} className="rounded bg-red-800 px-2 py-1">Banir autor</button>
                  <button disabled={busy} onClick={() => run({ action: "dismiss", messageId: r.id }, "Denúncia descartada.")} className="rounded bg-white/10 px-2 py-1">Descartar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel p-5">
        <h2 className="mb-3 font-display text-lg text-gold">Jogadores punidos</h2>
        {players.length === 0 ? <p className="text-sm text-white/50">Ninguém silenciado ou banido.</p> : (
          <ul className="space-y-1 text-sm">
            {players.map((p) => (
              <li key={p.name} className="flex justify-between rounded bg-black/30 px-3 py-2">
                <span>{p.name}</span>
                <span className="text-white/60">{p.banned ? "🚫 Banido" : `🔇 até ${new Date(p.mutedUntil!).toLocaleString("pt-BR")}`}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
