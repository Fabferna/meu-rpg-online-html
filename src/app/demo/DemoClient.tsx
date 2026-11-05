"use client";

import { useState } from "react";
import Link from "next/link";
import GameApp from "@/components/game/GameApp";
import { demoState, installDemoFetch } from "@/lib/demo/mock";

export default function DemoClient() {
  // Instala a API simulada antes do primeiro render do jogo.
  const [initial] = useState(() => {
    if (typeof window !== "undefined") installDemoFetch();
    return demoState();
  });
  return (
    <>
      <div className="bg-gradient-to-r from-arcane/80 to-ember/70 px-4 py-2 text-center text-sm">
        👀 <b>Modo demonstração</b>: navegue pelas telas à vontade. As ações estão desativadas.{" "}
        <Link href="/login?modo=registro" className="underline">Crie sua conta para jogar de verdade</Link>
      </div>
      <GameApp initial={initial} />
    </>
  );
}
