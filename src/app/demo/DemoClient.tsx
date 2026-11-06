"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import GameApp from "@/components/game/GameApp";
import CharacterCreator from "@/app/criar-personagem/CharacterCreator";
import { demoState, installDemoFetch } from "@/lib/demo/mock";
import { LanguageSwitcher, useT } from "@/lib/i18n/client";

export default function DemoClient() {
  const t = useT();
  // ?cena=criar mostra a criação de herói (sem conta, nada é salvo).
  const scene = useSearchParams().get("cena");
  // Instala a API simulada antes do primeiro render do jogo.
  const [initial] = useState(() => {
    if (typeof window !== "undefined") installDemoFetch();
    return demoState();
  });
  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-gradient-to-r from-arcane/80 to-ember/70 px-3 py-1.5 text-center text-xs sm:py-2 sm:text-sm">
        <span>👀 <b>{t("Modo demonstração")}</b><span className="hidden sm:inline">: {t("navegue pelas telas à vontade. As ações estão desativadas.")}</span></span>
        <Link href="/login?modo=registro" className="inline-flex min-h-11 items-center underline">{t("Crie sua conta para jogar de verdade")}</Link>
        {scene === "criar" && <span className="inline-flex"><LanguageSwitcher compact /></span>}
      </div>
      {scene === "criar" ? (
        <main className="mx-auto max-w-5xl px-4 py-6">
          <h1 className="text-center font-display text-3xl text-gold">{t("Forje seu Herói")}</h1>
          <CharacterCreator />
        </main>
      ) : (
        <GameApp initial={initial} />
      )}
    </>
  );
}
