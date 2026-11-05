"use client";

import { useCallback, useEffect, useState } from "react";
import type { GameCtx } from "./GameApp";
import { REFERRAL } from "@/lib/game/referrals";
import { post } from "./api";
import { Panel } from "./ui";
import { play } from "./sfx";

type Data = { code: string | null; paid: number; maxPaid: number; invited: { idx: number; name: string; level: number; claimed: boolean; ready: boolean }[] };

export default function Invite({ ctx }: { ctx: GameCtx }) {
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/referrals", { cache: "no-store" });
    if (r.ok) setD(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  const link = d?.code && typeof window !== "undefined" ? `${window.location.origin}/convite/${encodeURIComponent(d.code)}` : "";
  const shareText = `Vem jogar Aethelgard Online comigo! Entrando pelo meu convite você ganha 🪙 ${REFERRAL.welcomeGold} de ouro: ${link}`;

  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { ctx.toast("Não foi possível copiar. Selecione o link e copie manualmente.", "error"); }
  }

  async function claim(name: string) {
    setBusy(true);
    try {
      await post("/api/referrals/claim", { name });
      play("coin");
      ctx.toast(`💎 +${REFERRAL.inviterGems} pelo convite de ${name}!`, "reward");
      await Promise.all([load(), ctx.refresh()]);
    } catch (e) {
      ctx.toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="space-y-3 p-5">
      <h2 className="font-display text-xl text-gold">🤝 Convide amigos</h2>
      <p className="text-sm text-white/70">
        Seu amigo ganha <b>🪙 {REFERRAL.welcomeGold}</b> ao criar o herói pelo seu link. Quando ele chegar ao <b>nível {REFERRAL.levelRequired}</b>,
        você ganha <b>💎 {REFERRAL.inviterGems}</b> (até {REFERRAL.maxPaid} amigos).
      </p>
      {link ? (
        <>
          <div className="flex gap-2">
            <input id="invite-link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="input min-w-0 flex-1 text-xs" aria-label="Seu link de convite" />
            <button onClick={copy} className="btn-gold shrink-0 !px-3 !py-2 text-xs">{copied ? "Copiado!" : "Copiar"}</button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="rounded-md bg-[#25d366] px-3 py-1.5 font-semibold text-ink">WhatsApp</a>
            <a href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="rounded-md bg-[#229ed9] px-3 py-1.5 font-semibold">Telegram</a>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="rounded-md bg-white/10 px-3 py-1.5 font-semibold">X / Twitter</a>
          </div>
        </>
      ) : (
        <p className="text-xs text-white/40">Carregando seu link…</p>
      )}
      {d && d.invited.length > 0 && (
        <ul className="space-y-1.5 pt-2 text-sm">
          <li className="text-xs text-white/50">Amigos convidados ({d.invited.length}) · gemas recebidas por {d.paid}/{d.maxPaid}</li>
          {d.invited.map((i) => (
            <li key={i.idx} className="flex items-center justify-between gap-2 rounded-lg bg-black/30 px-3 py-2">
              <span className="truncate">{i.name} <span className="text-white/50">· Nv. {i.level}</span></span>
              {i.claimed ? <span className="text-xs text-emerald-300">✔ Recebido</span> :
                i.ready ? <button disabled={busy || d.paid >= d.maxPaid} onClick={() => claim(i.name)} className="btn-gold !px-3 !py-1 text-xs">💎 {REFERRAL.inviterGems}</button> :
                <span className="text-xs text-white/40">falta nível {REFERRAL.levelRequired}</span>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
