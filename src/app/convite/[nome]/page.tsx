import type { Metadata } from "next";
import RefCapture from "./RefCapture";
import { getT } from "@/lib/i18n/server";

type Props = { params: Promise<{ nome: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nome } = await params;
  const n = decodeURIComponent(nome).slice(0, 16);
  const t = await getT();
  const title = t("{x} convidou você para Aethelgard Online", { x: n });
  return {
    title,
    description: t("Crie seu herói pelo convite e comece com 300 de ouro extra."),
    openGraph: { title, description: t("Entre pelo convite e comece com 🪙 300 de ouro extra."), images: ["/og.jpg"] },
  };
}

export default async function Convite({ params }: Props) {
  const { nome } = await params;
  return <RefCapture name={decodeURIComponent(nome).slice(0, 16)} />;
}
