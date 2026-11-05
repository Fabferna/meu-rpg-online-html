import DemoClient from "./DemoClient";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Demonstração")} — Aethelgard Online` };
}

export default function DemoPage() {
  return <DemoClient />;
}
