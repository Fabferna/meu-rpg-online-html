"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Botão "Instalar app": só aparece quando o navegador oferece instalação (Chrome, Edge, Android). */
export default function InstallButton() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    const onInstalled = () => setEvt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  if (!evt) return null;
  return (
    <button title="Instalar o jogo como app" onClick={async () => { await evt.prompt(); await evt.userChoice; setEvt(null); }}
      className="rounded-md border border-gold/40 px-2 py-1 text-xs text-gold hover:bg-gold/10">
      📲 Instalar
    </button>
  );
}
