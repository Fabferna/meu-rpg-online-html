"use client";
import Image from "next/image";
import { COSMETIC_BY_ID } from "@/lib/shop/catalog";

/** Retrato redondo com a moldura cosmética equipada. */
export default function Avatar({ src, frame, size = 44 }: { src: string; frame?: string | null; size?: number }) {
  const f = frame ? COSMETIC_BY_ID[frame] : null;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className={`absolute overflow-hidden rounded-full ${f?.image ? "inset-[16%]" : `inset-0 ${f?.ring ?? "ring-2 ring-gold/60"}`}`}>
        <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" />
      </div>
      {f?.image && (
        // Arte com fundo preto: `screen` torna o preto transparente.
        <Image src={f.image} alt="" fill sizes={`${size}px`} className="pointer-events-none object-contain mix-blend-screen" />
      )}
    </div>
  );
}
