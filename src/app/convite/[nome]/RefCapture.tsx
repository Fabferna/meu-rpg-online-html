"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { REF_STORAGE_KEY, REFERRAL } from "@/lib/game/referrals";
import { useT } from "@/lib/i18n/client";

export default function RefCapture({ name }: { name: string }) {
  const t = useT();
  useEffect(() => {
    try { if (/^[A-Za-zÀ-ÿ0-9_]{3,16}$/.test(name)) localStorage.setItem(REF_STORAGE_KEY, name); } catch { /* ignora */ }
  }, [name]);
  return (
    <main className="relative grid min-h-dvh place-items-center px-4 py-10">
      <Image src="/assets/paisagem_epica_de_aethelgard.webp" alt="" fill className="-z-10 object-cover opacity-30" priority />
      <div className="panel w-full max-w-md p-8 text-center fade-up">
        <p className="text-sm text-white/60">{t("Você recebeu um convite de")}</p>
        <h1 className="mt-1 font-display text-3xl text-gold">{name}</h1>
        <p className="mt-4 text-white/80">{t("Crie seu herói em Aethelgard Online e comece com")} <b>{t("🪙 {n} de ouro extra", { n: REFERRAL.welcomeGold })}</b>.</p>
        <Link href="/login?modo=registro" className="btn-gold mt-6 inline-block w-full">{t("Aceitar convite")}</Link>
        <Link href="/demo" className="mt-3 inline-block text-sm text-white/60 underline">{t("Ver como é o jogo")}</Link>
      </div>
    </main>
  );
}
