"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useT } from "@/lib/i18n/client";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// O navegador avisa que dá para instalar ("beforeinstallprompt") UMA vez, logo ao carregar.
// Guardamos o aviso aqui, fora dos componentes: assim o botão funciona mesmo dentro do
// menu ☰, que só aparece depois (antes o aviso se perdia e o botão sumia no celular).
let saved: BIPEvent | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); saved = e as BIPEvent; emit(); });
  window.addEventListener("appinstalled", () => { saved = null; emit(); });
}
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

/** Já está rodando como app instalado? */
function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * Botão "Instalar".
 * - Chrome/Edge/Android: abre a instalação do navegador.
 * - iPhone/iPad e navegadores sem o aviso: mostra como instalar pelo menu do navegador.
 * - Já instalado: não aparece.
 */
export default function InstallButton({ big = false }: { big?: boolean }) {
  const t = useT();
  const evt = useSyncExternalStore(subscribe, () => saved, () => null);
  const [mode, setMode] = useState<"hidden" | "prompt" | "help">("hidden");
  const [help, setHelp] = useState(false);
  useEffect(() => {
    if (isStandalone()) return setMode("hidden");
    setMode(evt ? "prompt" : "help");
  }, [evt]);
  if (mode === "hidden") return null;

  const ios = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const cls = big
    ? "rounded-md border border-gold/40 px-3 text-sm text-gold hover:bg-gold/10"
    : "rounded-md border border-gold/40 px-2 py-1 text-xs text-gold hover:bg-gold/10";
  return (
    <>
      <button title={t("Instalar o jogo como app")} className={cls}
        onClick={async () => {
          if (mode === "prompt" && saved) { const e = saved; await e.prompt(); await e.userChoice; saved = null; emit(); }
          else setHelp((h) => !h);
        }}>
        {t("📲 Instalar")}
      </button>
      {help && (
        <p role="note" className="w-full rounded-md bg-black/40 p-2 text-xs text-white/80">
          {ios
            ? t("No iPhone/iPad: toque em Compartilhar (□↑) e depois em \"Adicionar à Tela de Início\".")
            : t("No menu do navegador (⋮), toque em \"Instalar app\" ou \"Adicionar à tela inicial\".")}
        </p>
      )}
    </>
  );
}
